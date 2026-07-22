const prisma = require('../config/prisma');

async function createDatasetWithVersion({ datasetData, versionData }) {
  return prisma.$transaction(async transaction => {
    const dataset = await transaction.dataset.create({
      data: datasetData,
    });

    const version = await transaction.datasetVersion.create({
      data: {
        ...versionData,
        datasetId: dataset.id,
      },
    });

    return { dataset, version };
  });
}

async function findDatasetWithLatestVersion(datasetId) {
  return prisma.dataset.findUnique({
    where: {
      id: datasetId,
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: 'desc',
        },
        take: 1,
        include: {
          columns: {
            orderBy: {
              ordinal: 'asc',
            },
          },
        },
      },
    },
  });
}

module.exports = {
  createDatasetWithVersion,
  findDatasetWithLatestVersion,
};
