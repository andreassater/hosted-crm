import { PrismaClient, LeadStatus, MeetingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.upsert({
    where: { email: 'jane@acme.io' },
    update: {},
    create: {
      name: 'Jane Doe',
      company: 'Acme Inc.',
      email: 'jane@acme.io',
      phone: '+1 555 0100',
      status: LeadStatus.QUALIFIED,
      value: 25000,
    },
  });

  const client = await prisma.keyClient.upsert({
    where: { companyName: 'Globex Corp' },
    update: {},
    create: {
      companyName: 'Globex Corp',
      primaryContact: 'John Smith',
      email: 'john@globex.com',
      phone: '+1 555 0199',
      tier: 'Platinum',
      annualRevenue: 500000,
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Discovery call',
      description: 'Intro + needs assessment',
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 90000000),
      status: MeetingStatus.SCHEDULED,
      leadId: lead.id,
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Quarterly business review',
      startTime: new Date(Date.now() + 2 * 86400000),
      endTime: new Date(Date.now() + 2 * 86400000 + 3600000),
      status: MeetingStatus.SCHEDULED,
      clientId: client.id,
    },
  });

  console.log('Seed data created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
