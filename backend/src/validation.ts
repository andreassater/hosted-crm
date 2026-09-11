import type { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';

// --- Schemas ---
// Zod strips unknown keys by default, so only these fields ever reach Prisma
// (prevents mass-assignment of arbitrary columns).

export const leadCreateSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).nullish(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'LOST']).default('NEW'),
  value: z.number().nonnegative().max(1_000_000_000).default(0),
});
export const leadUpdateSchema = leadCreateSchema.partial();

export const clientCreateSchema = z.object({
  companyName: z.string().min(1).max(200),
  primaryContact: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).nullish(),
  tier: z.string().min(1).max(50).default('Gold'),
  annualRevenue: z.number().nonnegative().max(1_000_000_000_000).default(0),
});
export const clientUpdateSchema = clientCreateSchema.partial();

export const meetingCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
  leadId: z.string().uuid().nullish(),
  clientId: z.string().uuid().nullish(),
});
export const meetingUpdateSchema = meetingCreateSchema.partial();

export const suggestionCreateSchema = z.object({
  message: z.string().min(1).max(2000),
  category: z.enum(['FEATURE', 'IMPROVEMENT', 'BUG', 'OTHER']).default('IMPROVEMENT'),
});
export const suggestionUpdateSchema = z.object({
  status: z.enum(['NEW', 'PLANNED', 'DONE', 'DECLINED']).optional(),
  category: z.enum(['FEATURE', 'IMPROVEMENT', 'BUG', 'OTHER']).optional(),
});

// An activity must attach to exactly one of a lead or a client.
const activityBase = z.object({
  type: z.enum(['MEETING', 'CALL', 'EMAIL', 'NOTE', 'TASK', 'OTHER']).default('NOTE'),
  occurredAt: z.coerce.date().default(() => new Date()),
  note: z.string().min(1).max(5000),
  followUpAt: z.coerce.date().nullish(),
  followUpNote: z.string().max(500).nullish(),
  leadId: z.string().uuid().nullish(),
  clientId: z.string().uuid().nullish(),
});

const exactlyOneParent = (d: { leadId?: string | null; clientId?: string | null }) =>
  Boolean(d.leadId) !== Boolean(d.clientId);

export const activityCreateSchema = activityBase.refine(exactlyOneParent, {
  message: 'Provide exactly one of leadId or clientId',
  path: ['leadId'],
});

// Update: any subset of fields, plus the ability to complete/reopen a follow-up.
export const activityUpdateSchema = activityBase.partial().extend({
  followUpDone: z.boolean().optional(),
});

/** Express middleware: validate & normalize req.body against a schema, or 400. */
export const validate =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
