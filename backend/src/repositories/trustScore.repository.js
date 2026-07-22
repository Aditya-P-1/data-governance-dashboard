const { Prisma } = require('@prisma/client');

async function createTrustScoreSnapshot(transaction, data) {
  return transaction.trustScoreSnapshot.create({
    data: {
      ...data,
      overallScore: new Prisma.Decimal(data.overallScore),
      qualityScore: new Prisma.Decimal(data.qualityScore),
      completenessScore: new Prisma.Decimal(data.completenessScore),
      freshnessScore: new Prisma.Decimal(data.freshnessScore),
      usageScore: new Prisma.Decimal(data.usageScore),
      classificationScore: new Prisma.Decimal(data.classificationScore),
    },
  });
}

module.exports = {
  createTrustScoreSnapshot,
};
