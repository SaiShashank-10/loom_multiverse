import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenvConfig({ path: path.resolve(__dirname, '../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/roadtripplanner',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  accommodationServiceUrl: process.env.ACCOMMODATION_SERVICE_URL || 'http://localhost:4000',
  passDocumentServiceUrl: process.env.PASS_DOCUMENT_SERVICE_URL || 'http://localhost:5000',
  billSplittingServiceUrl: process.env.BILL_SPLITTING_SERVICE_URL || 'http://localhost:6000',
};