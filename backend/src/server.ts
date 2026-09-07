import 'dotenv/config';
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// --- HEALTH ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- LEADS ENDPOINTS ---
app.get('/api/leads', async (_req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(leads);
});

app.post('/api/leads', async (req: Request, res: Response) => {
  try {
    const newLead = await prisma.lead.create({ data: req.body });
    res.status(201).json(newLead);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- MEETINGS ENDPOINTS ---
app.get('/api/meetings', async (_req: Request, res: Response) => {
  const meetings = await prisma.meeting.findMany({
    include: { lead: true, client: true },
    orderBy: { startTime: 'asc' },
  });
  res.json(meetings);
});

app.post('/api/meetings', async (req: Request, res: Response) => {
  try {
    const meeting = await prisma.meeting.create({ data: req.body });
    res.status(201).json(meeting);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- KEY CLIENTS ENDPOINTS ---
app.get('/api/clients', async (_req: Request, res: Response) => {
  const clients = await prisma.keyClient.findMany({ orderBy: { companyName: 'asc' } });
  res.json(clients);
});

app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const client = await prisma.keyClient.create({ data: req.body });
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`CRM Backend running on port ${PORT}`));
