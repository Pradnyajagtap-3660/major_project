const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER || process.env.USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'flood_response',
  password: process.env.DB_PASSWORD || undefined,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

module.exports = pool;
