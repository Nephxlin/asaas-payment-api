import dotenv from 'dotenv';

dotenv.config();

// Helper para garantir que a API Key tenha o $ no início
function normalizeAsaasApiKey(key: string | undefined): string {
  if (!key) return '';
  
  // Se já começa com $, retorna como está
  if (key.startsWith('$')) return key;
  
  // Se começa com aact_, adiciona o $
  if (key.startsWith('aact_')) return `$${key}`;
  
  // Caso contrário, retorna como está
  return key;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  ASAAS_API_KEY: normalizeAsaasApiKey(process.env.ASAAS_API_KEY || process.env.API_KEY),
  ASAAS_PIX_KEY: process.env.ASAAS_PIX_KEY || '',
  PHP_WEBHOOK_URL: process.env.PHP_WEBHOOK_URL || '',
};

