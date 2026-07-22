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
            include: {
              classifications: {
                orderBy: {
                  appliedAt: 'desc',
                },
                take: 1,
                include: {
                  classificationLabel: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

async function findDatasetWithLatestVersionQualityContext(datasetId) {
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
            include: {
              classifications: {
                orderBy: {
                  appliedAt: 'desc',
                },
                take: 1,
                include: {
                  classificationLabel: true,
                },
              },
            },
          },
          qualityRuns: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            include: {
              issues: {
                orderBy: {
                  createdAt: 'asc',
                },
                include: {
                  qualityRule: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

async function findDatasetWithLatestVersionValueContext(datasetId) {
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
          trustScores: {
            orderBy: {
              calculatedAt: 'desc',
            },
            take: 1,
          },
        },
      },
    },
  });
}

async function findDatasetsForDashboard({ search } = {}) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { businessDomain: { contains: search, mode: 'insensitive' } },
          { sourceSystem: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  return prisma.dataset.findMany({
    where,
    orderBy: {
      updatedAt: 'desc',
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
            include: {
              classifications: {
                orderBy: {
                  appliedAt: 'desc',
                },
                take: 1,
                include: {
                  classificationLabel: true,
                },
              },
            },
          },
          qualityRuns: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          trustScores: {
            orderBy: {
              calculatedAt: 'desc',
            },
            take: 1,
          },
          valueScores: {
            orderBy: {
              calculatedAt: 'desc',
            },
            take: 1,
          },
        },
      },
    },
  });
}

module.exports = {
  createDatasetWithVersion,
  findDatasetWithLatestVersion,
  findDatasetWithLatestVersionQualityContext,
  findDatasetWithLatestVersionValueContext,
  findDatasetsForDashboard,
};
