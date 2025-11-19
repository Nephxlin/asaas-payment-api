# 🔧 Setup - Asaas Payment API

Guia detalhado de instalação e configuração.

## 📋 Pré-requisitos

### Software Necessário
- **Node.js** 18.x ou superior ([Download](https://nodejs.org/))
- **Docker** e **Docker Compose** ([Download](https://www.docker.com/get-started))
- **Git** (opcional, para clonar o repositório)

### Conta Asaas
1. Crie uma conta em [Asaas](https://www.asaas.com/)
2. Acesse o painel administrativo
3. Obtenha sua **API Key**:
   - Menu → Integrações → API Key
   - Copie a chave (começa com `$aact_...`)
4. Configure uma **Chave PIX**:
   - Menu → PIX → Minhas Chaves
   - Cadastre uma chave PIX (CPF, CNPJ, email, etc)

## 🚀 Instalação

### 1. Clonar/Baixar o Projeto
```bash
# Se usar Git
git clone <url-do-repositorio>
cd asaas-payment-api

# Ou extraia o ZIP e navegue até a pasta
cd asaas-payment-api
```

### 2. Instalar Dependências
```bash
npm install
```

Isso instalará:
- Express (servidor web)
- Prisma (ORM)
- TypeScript
- Axios (HTTP client)
- E outras dependências

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac/Linux
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Ambiente
NODE_ENV=development

# Servidor
PORT=3000

# Banco de Dados PostgreSQL
DATABASE_URL=postgresql://asaas:asaas123@localhost:5432/asaas_payment

# Credenciais Asaas
ASAAS_API_KEY=sua_api_key_do_asaas
ASAAS_PIX_KEY=sua_chave_pix_cadastrada
```

**⚠️ IMPORTANTE:**
- Substitua `sua_api_key_do_asaas` pela sua API Key do Asaas
- Substitua `sua_chave_pix_cadastrada` pela chave PIX cadastrada
- **NUNCA** commite o arquivo `.env` no Git (já está no `.gitignore`)

### 4. Iniciar Banco de Dados (PostgreSQL)

```bash
docker-compose up -d
```

Isso irá:
- Baixar a imagem do PostgreSQL (se necessário)
- Criar um container com PostgreSQL
- Configurar banco `asaas_payment`
- Usuário: `asaas`, Senha: `asaas123`

**Verificar se está rodando:**
```bash
docker-compose ps
```

Você deve ver:
```
NAME                                COMMAND                  SERVICE             STATUS
asaas-payment-api-postgres-1       "docker-entrypoint.s…"   postgres            running
```

### 5. Configurar Banco de Dados (Migrations)

```bash
# Executar migrations
npx prisma migrate dev --name init

# Gerar Prisma Client
npx prisma generate
```

Isso irá:
- Criar as tabelas no PostgreSQL
- Configurar índices e constraints
- Gerar o cliente Prisma para TypeScript

**Verificar tabelas criadas:**
```bash
npx prisma studio
```

Abrirá uma interface web em `http://localhost:5555` onde você pode ver:
- Tabela `transactions`
- Tabela `webhook_logs`

### 6. Compilar TypeScript (Opcional)

```bash
npm run build
```

Isso compilará os arquivos `.ts` para `.js` na pasta `dist/`.

## ▶️ Executar

### Modo Desenvolvimento (com hot reload)
```bash
npm run dev
```

Logs esperados:
```
═══════════════════════════════════════════════════
🚀 Asaas Payment API
═══════════════════════════════════════════════════
📡 Servidor rodando na porta 3000
🌍 Ambiente: development
🔗 URL: http://localhost:3000
💚 Health check: http://localhost:3000/health
═══════════════════════════════════════════════════
📋 Endpoints disponíveis:
   POST   /api/payment/generate-qr
   GET    /api/payment/verify/:externalId
═══════════════════════════════════════════════════
```

### Modo Produção
```bash
# Build
npm run build

# Executar
npm start
```

## ✅ Verificar Instalação

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T12:00:00.000Z",
  "service": "asaas-payment-api",
  "version": "1.0.0"
}
```

### 2. Teste de Geração de QR Code

**Windows (PowerShell):**
```powershell
$body = @{
    userId = 123
    amount = 10.00
    externalId = "TEST_$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/payment/generate-qr" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

**Mac/Linux:**
```bash
curl -X POST http://localhost:3000/api/payment/generate-qr \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "amount": 10.00,
    "externalId": "TEST_'$(date +%s)'"
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "qrcode": "00020126...",
  "qrcodeImage": "data:image/png;base64,...",
  "transactionId": "a1b2c3d4...",
  "asaasQrCodeId": "qrc_...",
  "valor": 10.00
}
```

## 🔧 Configurações Avançadas

### Alterar Porta do Servidor
Edite `.env`:
```env
PORT=8080
```

### Usar PostgreSQL Externo
Edite `.env`:
```env
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
```

### Configurar CORS
Edite `src/server.ts`:
```typescript
app.use(cors({
  origin: 'https://seu-dominio.com', // Permitir apenas seu domínio
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
```

### Alterar Tempo de Expiração do QR Code
Edite `src/controllers/payment.controller.ts`:
```typescript
expirationSeconds: 600, // 10 minutos ao invés de 5
```

### Ambiente de Sandbox (Testes)
O Asaas possui um ambiente de sandbox para testes.

1. Crie uma conta sandbox em [Asaas Sandbox](https://sandbox.asaas.com/)
2. Obtenha a API Key do sandbox
3. Use no `.env`:
```env
ASAAS_API_KEY=sua_api_key_sandbox
```

## 🐛 Troubleshooting

### Erro: "Cannot find module '@prisma/client'"
**Solução:**
```bash
npx prisma generate
```

### Erro: "Port 3000 is already in use"
**Solução 1:** Mudar porta no `.env`:
```env
PORT=3001
```

**Solução 2:** Matar processo na porta 3000:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Erro: "Connection refused" ao acessar banco
**Solução:**
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Se não estiver, iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f postgres
```

### Erro: "Invalid API Key" do Asaas
**Causas comuns:**
1. API Key incorreta no `.env`
2. Usando API Key de produção em sandbox (ou vice-versa)
3. Chave PIX não cadastrada

**Solução:**
1. Verificar no painel Asaas se a API Key está correta
2. Certificar que está usando o ambiente correto
3. Verificar se a chave PIX está cadastrada e ativa

### Erro: "Transaction already exists"
**Causa:** `externalId` duplicado

**Solução:** Use IDs únicos para cada transação:
```javascript
const externalId = `DEP_${userId}_${Date.now()}`;
```

### QR Code não funciona ao escanear
**Causas comuns:**
1. Chave PIX não cadastrada ou inativa
2. Usando API Key de sandbox (não funciona com apps bancários reais)
3. QR Code expirado

**Solução:**
1. Verificar chave PIX no painel Asaas
2. Usar API Key de produção para pagamentos reais
3. Gerar novo QR Code

## 📊 Monitoramento

### Ver Logs do Servidor
Os logs aparecem no terminal onde você executou `npm run dev`.

Formato:
```
═══════════════════════════════════════════════════
🔄 GERANDO QR CODE PIX
UserId: 123
Amount: 10
ExternalId: TEST_123
═══════════════════════════════════════════════════
🔄 Criando QR Code no Asaas...
✅ QR Code criado no Asaas: qrc_xxxxx
💾 Salvando transação no banco...
✅ Transação salva: uuid-aqui
═══════════════════════════════════════════════════
✅ QR CODE GERADO COM SUCESSO
═══════════════════════════════════════════════════
```

### Prisma Studio (Interface Visual do Banco)
```bash
npx prisma studio
```

Abre em `http://localhost:5555`

### Logs do PostgreSQL
```bash
docker-compose logs -f postgres
```

## 🔐 Segurança em Produção

### 1. Variáveis de Ambiente
```env
NODE_ENV=production
```

### 2. CORS Restrito
```typescript
app.use(cors({
  origin: 'https://seu-dominio.com',
  credentials: true
}));
```

### 3. HTTPS
Use um proxy reverso como Nginx:
```nginx
server {
    listen 443 ssl;
    server_name api.seu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### 4. Rate Limiting
Instale `express-rate-limit`:
```bash
npm install express-rate-limit
```

Configure em `server.ts`:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições
});

app.use('/api/', limiter);
```

## 📚 Próximos Passos

1. ✅ Teste a API com cURL ou Postman
2. ✅ Integre com seu sistema PHP/JavaScript
3. ✅ Configure ambiente de produção
4. ✅ Faça deploy (ver guia abaixo)
5. ✅ Configure monitoramento e logs

## 🚀 Deploy

### Opção 1: Railway
1. Crie conta em [Railway](https://railway.app/)
2. Conecte seu repositório GitHub
3. Configure variáveis de ambiente
4. Deploy automático

### Opção 2: Render
1. Crie conta em [Render](https://render.com/)
2. Novo → Web Service
3. Conecte repositório
4. Configure:
   - Build: `npm install && npx prisma generate`
   - Start: `npm start`
   - Adicione PostgreSQL
   - Configure variáveis de ambiente

### Opção 3: AWS/Azure/GCP
Use Docker:
```bash
docker build -t asaas-payment-api .
docker run -p 3000:3000 asaas-payment-api
```

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Verifique os logs do PostgreSQL
3. Use Prisma Studio para ver o banco
4. Teste com cURL primeiro
5. Consulte a [documentação do Asaas](https://docs.asaas.com/)

---

**Setup completo!** 🎉

Próximo: [QUICKSTART.md](./QUICKSTART.md) para começar a usar.
