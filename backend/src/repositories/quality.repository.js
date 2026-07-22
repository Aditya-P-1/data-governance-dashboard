const { Prisma } = require('@prisma/client');

const QUALITY_RULE_DEFINITIONS = [
  {
    code: 'MISSING_VALUES',
    name: 'Missing Values',
    description: 'Counts empty cells across the dataset.',
    scope: 'BOTH',
    category: 'COMPLETENESS',
    severity: 'HIGH',
  },
  {
    code: 'DUPLICATE_ROWS',
    name: 'Duplicate Rows',
    description: 'Counts exact duplicate rows in the dataset.',
    scope: 'DATASET',
    category: 'UNIQUENESS',
    severity: 'MEDIUM',
  },
  {
    code: 'INVALID_VALUES',
    name: 'Invalid Values',
    description: 'Counts cells that do not match the expected column type or classification rule.',
    scope: 'BOTH',
    category: 'VALIDITY',
    severity: 'HIGH',
  },
];

async function ensureQualityRules(transaction) {
  const rules = await Promise.all(
    QUALITY_RULE_DEFINITIONS.map(definition =>
      transaction.qualityRule.upsert({
        where: {
          code: definition.code,
        },
        create: definition,
        update: {
          name: definition.name,
          description: definition.description,
          scope: definition.scope,
          category: definition.category,
          severity: definition.severity,
          isActive: true,
        },
      }),
    ),
  );

  return rules.reduce((accumulator, rule) => {
    accumulator[rule.code] = rule;
    return accumulator;
  }, {});
}

async function createQualityRun(transaction, data) {
  return transaction.qualityRun.create({
    data: {
      ...data,
      qualityScore:
        data.qualityScore === null || typeof data.qualityScore === 'undefined'
          ? null
          : new Prisma.Decimal(data.qualityScore),
    },
  });
}

async function updateQualityRun(transaction, qualityRunId, data) {
  return transaction.qualityRun.update({
    where: {
      id: qualityRunId,
    },
    data: {
      ...data,
      qualityScore:
        typeof data.qualityScore === 'undefined'
          ? undefined
          : data.qualityScore === null
            ? null
            : new Prisma.Decimal(data.qualityScore),
    },
  });
}

async function createQualityIssues(transaction, issues) {
  if (!issues.length) {
    return [];
  }

  await transaction.qualityIssue.createMany({
    data: issues.map(issue => ({
      ...issue,
      affectedRows:
        typeof issue.affectedRows === 'undefined' || issue.affectedRows === null
          ? null
          : BigInt(issue.affectedRows),
    })),
  });

  return transaction.qualityIssue.findMany({
    where: {
      qualityRunId: issues[0].qualityRunId,
    },
    include: {
      qualityRule: true,
      datasetColumn: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

module.exports = {
  QUALITY_RULE_DEFINITIONS,
  createQualityIssues,
  createQualityRun,
  ensureQualityRules,
  updateQualityRun,
};
