const prisma = require('../config/prisma');

async function getOrCreateSystemUser() {
  return prisma.user.upsert({
    where: {
      email: 'system@data-governance.local',
    },
    update: {},
    create: {
      email: 'system@data-governance.local',
      fullName: 'System User',
      role: 'ADMIN',
    },
  });
}

module.exports = {
  getOrCreateSystemUser,
};
