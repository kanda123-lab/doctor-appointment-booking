const { Pool } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

dbPool.on('error', (err) => {
  console.error('Database pool error:', err);
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

module.exports = {
  db: dbPool,
  redis
};