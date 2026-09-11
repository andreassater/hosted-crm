import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the whole app (server routes + auth roster upsert).
export const prisma = new PrismaClient();
