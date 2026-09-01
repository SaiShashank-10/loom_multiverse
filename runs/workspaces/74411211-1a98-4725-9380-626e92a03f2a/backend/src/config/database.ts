import { PoolConfig } from 'pg';

const databaseConfig: PoolConfig = {
  user: process.env.DB_USER || 'techaccessory',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'techaccessorydb',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432', 10),
};

export default databaseConfig;