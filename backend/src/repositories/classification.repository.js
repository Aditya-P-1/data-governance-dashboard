const { Prisma } = require('@prisma/client');

const CLASSIFICATION_LABEL_DEFINITIONS = [
  {
    code: 'EMAIL',
    name: 'Email',
    description: 'Personal or business email address.',
    level: 'CONFIDENTIAL',
    sortOrder: 1,
  },
  {
    code: 'PHONE',
    name: 'Phone',
    description: 'Personal or business phone number.',
    level: 'CONFIDENTIAL',
    sortOrder: 2,
  },
  {
    code: 'NAME',
    name: 'Name',
    description: 'Person or contact name.',
    level: 'CONFIDENTIAL',
    sortOrder: 3,
  },
  {
    code: 'GOVERNMENT_ID',
    name: 'Government ID',
    description: 'Government-issued identifier such as SSN, passport, tax ID, or national ID.',
    level: 'RESTRICTED',
    sortOrder: 4,
  },
  {
    code: 'ADDRESS',
    name: 'Address',
    description: 'Street address or location-bearing address field.',
    level: 'RESTRICTED',
    sortOrder: 5,
  },
  {
    code: 'DATE_OF_BIRTH',
    name: 'Date of Birth',
    description: 'Birth date for an individual.',
    level: 'RESTRICTED',
    sortOrder: 6,
  },
];

async function ensureClassificationLabels(transaction) {
  const labels = await Promise.all(
    CLASSIFICATION_LABEL_DEFINITIONS.map(definition =>
      transaction.classificationLabel.upsert({
        where: {
          code: definition.code,
        },
        create: definition,
        update: {
          name: definition.name,
          description: definition.description,
          level: definition.level,
          sortOrder: definition.sortOrder,
          isActive: true,
        },
      }),
    ),
  );

  return labels.reduce((accumulator, label) => {
    accumulator[label.code] = label;
    return accumulator;
  }, {});
}

async function deleteColumnClassifications(transaction, { datasetId, datasetVersionId, datasetColumnId, source }) {
  return transaction.classificationAssignment.deleteMany({
    where: {
      datasetId,
      datasetVersionId,
      datasetColumnId,
      scope: 'COLUMN',
      source,
    },
  });
}

async function createColumnClassification(transaction, data) {
  return transaction.classificationAssignment.create({
    data: {
      ...data,
      confidence:
        data.confidence === null || typeof data.confidence === 'undefined'
          ? null
          : new Prisma.Decimal(data.confidence),
    },
    include: {
      classificationLabel: true,
    },
  });
}

module.exports = {
  CLASSIFICATION_LABEL_DEFINITIONS,
  createColumnClassification,
  deleteColumnClassifications,
  ensureClassificationLabels,
};
