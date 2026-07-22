const { Prisma } = require('@prisma/client');

async function createDataValueSnapshot(transaction, data) {
  return transaction.dataValueSnapshot.create({
    data: {
      ...data,
      overallScore: new Prisma.Decimal(data.overallScore),
      businessCriticalityScore: new Prisma.Decimal(data.businessCriticalityScore),
      qualityScore: new Prisma.Decimal(data.qualityScore),
      freshnessScore: new Prisma.Decimal(data.freshnessScore),
      usageScore: new Prisma.Decimal(data.usageScore),
    },
  });
}

module.exports = {
  createDataValueSnapshot,
};
