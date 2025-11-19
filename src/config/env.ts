import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  ASAAS_API_KEY: process.env.ASAAS_API_KEY || process.env.API_KEY || '',
  ASAAS_PIX_KEY: process.env.ASAAS_PIX_KEY || '',
  PHP_WEBHOOK_URL: process.env.PHP_WEBHOOK_URL || '',
};

