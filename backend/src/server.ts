import 'dotenv/config';
import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './auth';
import {
  validate,
  leadCreateSchema,
  leadUpdateSchema,
  clientCreateSchema,
  clientUpdateSchema,
  meetingCreateSchema,
  meetingUpdateSchema,
  suggestionCreateSchema,
  suggestionUpdateSchema,
  activityCreateSchema,
  activityUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from './validation';

const app = express();

// Behind Railway/Render/Vercel proxies — needed for correct client IPs (rate limiting).
app.set('trust proxy', 1);

// Security headers.
app.use(helmet());

// In production, restrict CORS to a comma-separated allowlist via CORS_ORIGIN
// (e.g. "https://crm.vercel.app"). Unset = allow all origins (fine for local dev).
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));

app.use(express.json({ limit: '100kb' }));

// Basic rate limiting on the API surface.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/** Wrap an async route so thrown errors become 400/500s instead of crashing. */
const handler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response) => {
    fn(req, res).catch((err) => {
      const status = err instanceof Prisma.PrismaClientKnownRequestError ? 400 : 500;
      res.status(status).json({ error: (err as Error).message });
    });
  };

/** Latest touchpoint (activity or meeting) per lead — powers inactivity flags. */
async function lastActivityByLead(ids: string[]): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (ids.length === 0) return map;
  const [acts, meets] = await Promise.all([
    prisma.activity.groupBy({ by: ['leadId'], where: { leadId: { in: ids } }, _max: { occurredAt: true } }),
    prisma.meeting.groupBy({ by: ['leadId'], where: { leadId: { in: ids } }, _max: { startTime: true } }),
  ]);
  for (const a of acts) if (a.leadId && a._max.occurredAt) map.set(a.leadId, a._max.occurredAt);
  for (const m of meets) {
    if (!m.leadId || !m._max.startTime) continue;
    const cur = map.get(m.leadId);
    if (!cur || m._max.startTime > cur) map.set(m.leadId, m._max.startTime);
  }
  return map;
}

/** Latest touchpoint (activity or meeting) per client. */
async function lastActivityByClient(ids: string[]): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (ids.length === 0) return map;
  const [acts, meets] = await Promise.all([
    prisma.activity.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _max: { occurredAt: true } }),
    prisma.meeting.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _max: { startTime: true } }),
  ]);
  for (const a of acts) if (a.clientId && a._max.occurredAt) map.set(a.clientId, a._max.occurredAt);
  for (const m of meets) {
    if (!m.clientId || !m._max.startTime) continue;
    const cur = map.get(m.clientId);
    if (!cur || m._max.startTime > cur) map.set(m.clientId, m._max.startTime);
  }
  return map;
}

/** Resolve an `owner`/`assignee` query value into a Prisma id filter. */
function ownerFilter(value: unknown, meId?: string): string | null | undefined {
  if (value === 'none') return null; // unassigned
  if (value === 'me') return meId ?? '__none__';
  if (typeof value === 'string' && value) return value;
  return undefined; // no filter
}

/** Keep only rows whose last activity is older than `days` (or never active). */
function filterInactive<T extends { lastActivityAt: string | null }>(rows: T[], days: number): T[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return rows.filter((r) => !r.lastActivityAt || new Date(r.lastActivityAt).getTime() < cutoff);
}

// --- HEALTH (public) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Everything below /api requires a valid Supabase access token.
app.use('/api', requireAuth);

// ========================= LEADS =========================
app.get(
  '/api/leads',
  handler(async (req, res) => {
    const { status, search, owner, overdueTasks, inactiveDays } = req.query;
    const where: Prisma.LeadWhereInput = {};
    if (typeof status === 'string' && status) where.status = status as Prisma.LeadWhereInput['status'];
    if (typeof search === 'string' && search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const ownerId = ownerFilter(owner, req.user?.id);
    if (ownerId !== undefined) where.ownerId = ownerId;
    if (overdueTasks === 'true') {
      where.tasks = { some: { status: 'OPEN', dueDate: { lt: new Date() } } };
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { owner: true, _count: { select: { tasks: { where: { status: 'OPEN' } } } } },
      orderBy: { createdAt: 'desc' },
    });

    const activity = await lastActivityByLead(leads.map((l) => l.id));
    let rows = leads.map(({ _count, ...l }) => ({
      ...l,
      openTaskCount: _count.tasks,
      lastActivityAt: activity.get(l.id)?.toISOString() ?? null,
    }));

    const days = Number(inactiveDays);
    if (Number.isFinite(days) && days > 0) rows = filterInactive(rows, days);

    res.json(rows);
  })
);

app.post(
  '/api/leads',
  validate(leadCreateSchema),
  handler(async (req, res) => {
    // Default the owner to the creator unless one was explicitly provided (incl. null).
    const ownerId = req.body.ownerId === undefined ? (req.user?.id ?? null) : req.body.ownerId;
    const lead = await prisma.lead.create({ data: { ...req.body, ownerId } });
    res.status(201).json(lead);
  })
);

app.put(
  '/api/leads/:id',
  validate(leadUpdateSchema),
  handler(async (req, res) => {
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: req.body });
    res.json(lead);
  })
);

app.delete(
  '/api/leads/:id',
  handler(async (req, res) => {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// ========================= MEETINGS =========================
app.get(
  '/api/meetings',
  handler(async (req, res) => {
    const { status, from, to } = req.query;
    const where: Prisma.MeetingWhereInput = {};
    if (typeof status === 'string' && status)
      where.status = status as Prisma.MeetingWhereInput['status'];
    if (typeof from === 'string' || typeof to === 'string') {
      where.startTime = {};
      if (typeof from === 'string') where.startTime.gte = new Date(from);
      if (typeof to === 'string') where.startTime.lte = new Date(to);
    }
    const meetings = await prisma.meeting.findMany({
      where,
      include: { lead: true, client: true },
      orderBy: { startTime: 'asc' },
    });
    res.json(meetings);
  })
);

app.post(
  '/api/meetings',
  validate(meetingCreateSchema),
  handler(async (req, res) => {
    const meeting = await prisma.meeting.create({ data: req.body });
    res.status(201).json(meeting);
  })
);

app.put(
  '/api/meetings/:id',
  validate(meetingUpdateSchema),
  handler(async (req, res) => {
    const meeting = await prisma.meeting.update({ where: { id: req.params.id }, data: req.body });
    res.json(meeting);
  })
);

app.delete(
  '/api/meetings/:id',
  handler(async (req, res) => {
    await prisma.meeting.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// ========================= KEY CLIENTS =========================
app.get(
  '/api/clients',
  handler(async (req, res) => {
    const { tier, search, owner, overdueTasks, inactiveDays } = req.query;
    const where: Prisma.KeyClientWhereInput = {};
    if (typeof tier === 'string' && tier) where.tier = tier;
    if (typeof search === 'string' && search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { primaryContact: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const ownerId = ownerFilter(owner, req.user?.id);
    if (ownerId !== undefined) where.ownerId = ownerId;
    if (overdueTasks === 'true') {
      where.tasks = { some: { status: 'OPEN', dueDate: { lt: new Date() } } };
    }

    const clients = await prisma.keyClient.findMany({
      where,
      include: { owner: true, _count: { select: { tasks: { where: { status: 'OPEN' } } } } },
      orderBy: { companyName: 'asc' },
    });

    const activity = await lastActivityByClient(clients.map((c) => c.id));
    let rows = clients.map(({ _count, ...c }) => ({
      ...c,
      openTaskCount: _count.tasks,
      lastActivityAt: activity.get(c.id)?.toISOString() ?? null,
    }));

    const days = Number(inactiveDays);
    if (Number.isFinite(days) && days > 0) rows = filterInactive(rows, days);

    res.json(rows);
  })
);

app.post(
  '/api/clients',
  validate(clientCreateSchema),
  handler(async (req, res) => {
    const ownerId = req.body.ownerId === undefined ? (req.user?.id ?? null) : req.body.ownerId;
    const client = await prisma.keyClient.create({ data: { ...req.body, ownerId } });
    res.status(201).json(client);
  })
);

app.put(
  '/api/clients/:id',
  validate(clientUpdateSchema),
  handler(async (req, res) => {
    const client = await prisma.keyClient.update({ where: { id: req.params.id }, data: req.body });
    res.json(client);
  })
);

app.delete(
  '/api/clients/:id',
  handler(async (req, res) => {
    await prisma.keyClient.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// ========================= SUGGESTIONS (improvement tips) =========================
app.get(
  '/api/suggestions',
  handler(async (req, res) => {
    const { status, category } = req.query;
    const where: Prisma.SuggestionWhereInput = {};
    if (typeof status === 'string' && status)
      where.status = status as Prisma.SuggestionWhereInput['status'];
    if (typeof category === 'string' && category)
      where.category = category as Prisma.SuggestionWhereInput['category'];
    const suggestions = await prisma.suggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(suggestions);
  })
);

app.post(
  '/api/suggestions',
  validate(suggestionCreateSchema),
  handler(async (req, res) => {
    // The submitter is taken from the verified token, never from the client.
    const suggestion = await prisma.suggestion.create({
      data: { ...req.body, submittedBy: req.user?.email ?? null },
    });
    res.status(201).json(suggestion);
  })
);

app.put(
  '/api/suggestions/:id',
  validate(suggestionUpdateSchema),
  handler(async (req, res) => {
    const suggestion = await prisma.suggestion.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(suggestion);
  })
);

app.delete(
  '/api/suggestions/:id',
  handler(async (req, res) => {
    await prisma.suggestion.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// ========================= ACTIVITIES (log + follow-ups) =========================
// List activities for one lead or client, newest first.
app.get(
  '/api/activities',
  handler(async (req, res) => {
    const { leadId, clientId } = req.query;
    const where: Prisma.ActivityWhereInput = {};
    if (typeof leadId === 'string' && leadId) where.leadId = leadId;
    if (typeof clientId === 'string' && clientId) where.clientId = clientId;
    const activities = await prisma.activity.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
    });
    res.json(activities);
  })
);

app.post(
  '/api/activities',
  validate(activityCreateSchema),
  handler(async (req, res) => {
    // createdBy comes from the verified token, never the client.
    const activity = await prisma.activity.create({
      data: { ...req.body, createdBy: req.user?.email ?? null },
    });
    res.status(201).json(activity);
  })
);

app.put(
  '/api/activities/:id',
  validate(activityUpdateSchema),
  handler(async (req, res) => {
    const { followUpDone, ...rest } = req.body as Prisma.ActivityUncheckedUpdateInput & {
      followUpDone?: boolean;
    };
    const data: Prisma.ActivityUncheckedUpdateInput = { ...rest };
    // Keep followUpDoneAt in sync when the follow-up is completed/reopened.
    if (followUpDone !== undefined) {
      data.followUpDone = followUpDone;
      data.followUpDoneAt = followUpDone ? new Date() : null;
    }
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data,
    });
    res.json(activity);
  })
);

app.delete(
  '/api/activities/:id',
  handler(async (req, res) => {
    await prisma.activity.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// Merged chronological timeline (activities + meetings) for one lead or client.
app.get(
  '/api/timeline',
  handler(async (req, res) => {
    const { leadId, clientId } = req.query;
    const parent: { leadId?: string; clientId?: string } = {};
    if (typeof leadId === 'string' && leadId) parent.leadId = leadId;
    if (typeof clientId === 'string' && clientId) parent.clientId = clientId;
    if (!parent.leadId && !parent.clientId) {
      res.status(400).json({ error: 'Provide leadId or clientId' });
      return;
    }

    const [activities, meetings] = await Promise.all([
      prisma.activity.findMany({ where: parent, orderBy: { occurredAt: 'desc' } }),
      prisma.meeting.findMany({ where: parent, orderBy: { startTime: 'desc' } }),
    ]);

    // Normalize both into a single shape the timeline can render.
    const items = [
      ...activities.map((a) => ({
        id: a.id,
        kind: 'activity' as const,
        type: a.type as string,
        title: null as string | null,
        note: a.note,
        at: a.occurredAt,
        followUpAt: a.followUpAt,
        followUpNote: a.followUpNote,
        followUpDone: a.followUpDone,
        createdBy: a.createdBy,
      })),
      ...meetings.map((m) => ({
        id: m.id,
        kind: 'meeting' as const,
        type: 'MEETING',
        title: m.title,
        note: m.description,
        at: m.startTime,
        followUpAt: null,
        followUpNote: null,
        followUpDone: false,
        createdBy: null,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    res.json(items);
  })
);

// Open follow-ups across all accounts, soonest first — powers the follow-up dashboard.
app.get(
  '/api/followups',
  handler(async (_req, res) => {
    const followups = await prisma.activity.findMany({
      where: { followUpAt: { not: null }, followUpDone: false },
      include: { lead: true, client: true },
      orderBy: { followUpAt: 'asc' },
    });
    res.json(followups);
  })
);

// ========================= USERS (team roster) =========================
// Read-only roster for owner/assignee dropdowns. Populated automatically on login.
app.get(
  '/api/users',
  handler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, email: true, name: true },
    });
    res.json(users);
  })
);

// Current authenticated user (id + email), so the frontend can filter "my tasks".
app.get('/api/me', (req, res) => {
  res.json(req.user ?? null);
});

// ========================= TASKS =========================
app.get(
  '/api/tasks',
  handler(async (req, res) => {
    const { assignee, status, scope, leadId, clientId } = req.query;
    const where: Prisma.TaskWhereInput = {};

    const assigneeId = ownerFilter(assignee, req.user?.id);
    if (assigneeId !== undefined) where.assigneeId = assigneeId;
    if (status === 'OPEN' || status === 'DONE') where.status = status;
    if (typeof leadId === 'string' && leadId) where.leadId = leadId;
    if (typeof clientId === 'string' && clientId) where.clientId = clientId;
    if (scope === 'overdue') {
      where.status = 'OPEN';
      where.dueDate = { lt: new Date() };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        lead: { select: { id: true, name: true, company: true } },
        client: { select: { id: true, companyName: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: { sort: 'asc', nulls: 'last' } }],
    });
    res.json(tasks);
  })
);

app.post(
  '/api/tasks',
  validate(taskCreateSchema),
  handler(async (req, res) => {
    // Default the assignee to the creator unless one was explicitly provided (incl. null).
    const assigneeId =
      req.body.assigneeId === undefined ? (req.user?.id ?? null) : req.body.assigneeId;
    const task = await prisma.task.create({
      data: { ...req.body, assigneeId, createdBy: req.user?.email ?? null },
    });
    res.status(201).json(task);
  })
);

app.put(
  '/api/tasks/:id',
  validate(taskUpdateSchema),
  handler(async (req, res) => {
    const data: Prisma.TaskUncheckedUpdateInput = { ...req.body };
    // Keep completedAt in sync with status transitions.
    if (req.body.status === 'DONE') data.completedAt = new Date();
    if (req.body.status === 'OPEN') data.completedAt = null;
    const task = await prisma.task.update({ where: { id: req.params.id }, data });
    res.json(task);
  })
);

app.delete(
  '/api/tasks/:id',
  handler(async (req, res) => {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

const PORT = process.env.PORT || 5050;
if (process.env.AUTH_DISABLED === 'true') {
  console.warn('⚠️  AUTH_DISABLED=true — API is UNAUTHENTICATED. Never use this in production.');
}
app.listen(PORT, () => console.log(`CRM Backend running on port ${PORT}`));
