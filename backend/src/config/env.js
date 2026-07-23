require('dotenv').config();

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

const defaultOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
const envOrigins = parseOrigins(process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/data_governance_dashboard',
  allowedOrigins: envOrigins.length > 0 ? envOrigins : defaultOrigins,
};

module.exports = env;
