import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import paymentRoutes from './routes/payment.routes';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint - verificar variáveis de ambiente
app.get('/debug/env', (req: Request, res: Response) => {
  res.json({
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    HAS_DATABASE_URL: !!env.DATABASE_URL,
    DATABASE_URL_PREFIX: env.DATABASE_URL?.substring(0, 20) + '...',
    HAS_ASAAS_API_KEY: !!env.ASAAS_API_KEY,
    ASAAS_API_KEY_LENGTH: env.ASAAS_API_KEY?.length || 0,
    ASAAS_API_KEY_PREFIX: env.ASAAS_API_KEY?.substring(0, 20) + '...',
    HAS_ASAAS_PIX_KEY: !!env.ASAAS_PIX_KEY,
    ASAAS_PIX_KEY_VALUE: env.ASAAS_PIX_KEY
  });
});

// Routes
app.use('/api/payment', paymentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
});

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${env.NODE_ENV}`);
  console.log(`📡 API disponível em http://localhost:${PORT}`);
});


