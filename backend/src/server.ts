import 'dotenv/config';
import express, { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
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
} from './validation';

const prisma = new PrismaClient();
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
    const { status, search } = req.query;
    const where: Prisma.LeadWhereInput = {};
    if (typeof status === 'string' && status) where.status = status as Prisma.LeadWhereInput['status'];
    if (typeof search === 'string' && search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(leads);
  })
);

app.post(
  '/api/leads',
  validate(leadCreateSchema),
  handler(async (req, res) => {
    const lead = await prisma.lead.create({ data: req.body });
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
    const { tier, search } = req.query;
    const where: Prisma.KeyClientWhereInput = {};
    if (typeof tier === 'string' && tier) where.tier = tier;
    if (typeof search === 'string' && search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { primaryContact: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const clients = await prisma.keyClient.findMany({ where, orderBy: { companyName: 'asc' } });
    res.json(clients);
  })
);

app.post(
  '/api/clients',
  validate(clientCreateSchema),
  handler(async (req, res) => {
    const client = await prisma.keyClient.create({ data: req.body });
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

const PORT = process.env.PORT || 5050;
if (process.env.AUTH_DISABLED === 'true') {
  console.warn('⚠️  AUTH_DISABLED=true — API is UNAUTHENTICATED. Never use this in production.');
}
app.listen(PORT, () => console.log(`CRM Backend running on port ${PORT}`));
