const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

async function start() {
  const server = app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });

  prisma
    .$connect()
    .then(() => {
      console.log('Prisma connected to PostgreSQL');
    })
    .catch(error => {
      console.error('Prisma connection failed', error);
    });

  const shutdown = async signal => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
}

start().catch(error => {
  console.error('Failed to start backend server', error);
  process.exit(1);
});
