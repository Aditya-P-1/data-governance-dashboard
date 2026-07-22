async function getOrCreateSystemConsumer(transaction) {
  return transaction.dataConsumer.upsert({
    where: {
      externalId: 'system-dashboard',
    },
    create: {
      name: 'System Dashboard',
      type: 'DASHBOARD',
      externalId: 'system-dashboard',
      description: 'Default consumer used for dataset view tracking.',
    },
    update: {
      name: 'System Dashboard',
      type: 'DASHBOARD',
      description: 'Default consumer used for dataset view tracking.',
    },
  });
}

async function createUsageEvent(transaction, data) {
  return transaction.usageEvent.create({
    data,
  });
}

async function getDatasetViewStats(client, datasetId, now = new Date()) {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [viewCount, lastViewedEvent, viewsLast30Days, firstViewedEvent] = await Promise.all([
    client.usageEvent.count({
      where: {
        datasetId,
        eventType: 'VIEW',
      },
    }),
    client.usageEvent.findFirst({
      where: {
        datasetId,
        eventType: 'VIEW',
      },
      orderBy: {
        occurredAt: 'desc',
      },
      select: {
        occurredAt: true,
      },
    }),
    client.usageEvent.count({
      where: {
        datasetId,
        eventType: 'VIEW',
        occurredAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    client.usageEvent.findFirst({
      where: {
        datasetId,
        eventType: 'VIEW',
      },
      orderBy: {
        occurredAt: 'asc',
      },
      select: {
        occurredAt: true,
      },
    }),
  ]);

  return {
    viewCount,
    viewsLast30Days,
    lastViewedAt: lastViewedEvent?.occurredAt || null,
    firstViewedAt: firstViewedEvent?.occurredAt || null,
    accessFrequencyPerDay: Number((viewsLast30Days / 30).toFixed(4)),
  };
}

module.exports = {
  createUsageEvent,
  getDatasetViewStats,
  getOrCreateSystemConsumer,
};
