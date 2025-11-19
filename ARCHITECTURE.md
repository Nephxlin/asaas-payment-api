# 🏗️ Arquitetura da API Asaas Payment (Versão Simplificada)

## 📐 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENTE (PHP/JavaScript)                    │
│                                                                  │
│  Funções:                                                        │
│  - Gerar QR Code                                                │
│  - Exibir QR Code para usuário                                  │
│  - Verificar pagamento quando usuário solicitar                 │
│  - Liberar acesso após confirmação                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
        ┌─────────────────┐  ┌──────────────────┐
        │ POST /generate- │  │ GET /verify/     │
        │ qr              │  │ :externalId      │
        └────────┬────────┘  └────────┬─────────┘
                 │                    │
                 │                    │
                 ▼                    ▼
        ┌─────────────────────────────────────────┐
        │       NODE.JS API (Port 3000)           │
        │                                         │
        │  ┌──────────────────────────────────┐  │
        │  │      Express Server              │  │
        │  │  ┌────────────┐                  │  │
        │  │  │  Payment   │                  │  │
        │  │  │  Routes    │                  │  │
        │  │  └─────┬──────┘                  │  │
        │  │        │                         │  │
        │  │        ▼                         │  │
        │  │  ┌────────────┐                  │  │
        │  │  │  Payment   │                  │  │
        │  │  │ Controller │                  │  │
        │  │  └─────┬──────┘                  │  │
        │  └────────┼─────────────────────────┘  │
        │           │                            │
        │           ▼                            │
        │  ┌──────────────────────────────────┐  │
        │  │         Services Layer           │  │
        │  │  ┌────────────┐                  │  │
        │  │  │   Asaas    │                  │  │
        │  │  │  Service   │                  │  │
        │  │  └─────┬──────┘                  │  │
        │  └────────┼─────────────────────────┘  │
        │           │                            │
        │  ┌────────▼─────────────────────────┐  │
        │  │        Prisma ORM                │  │
        │  │     (Database Client)            │  │
        │  └────────┬─────────────────────────┘  │
        └───────────┼─────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │     PostgreSQL            │
        │    (Docker Container)     │
        │                           │
        │  Tables:                  │
        │  - transactions           │
        │  - webhook_logs (unused)  │
        └───────────────────────────┘

                    │
                    │ HTTP Requests
                    ▼
        ┌──────────────────────────┐
        │   ASAAS API              │
        │                          │
        │  - POST /pix/qrCodes/    │
        │    static                │
        │  - GET /pix/transactions │
        └──────────────────────────┘
```

## 🔀 Fluxos de Dados

### 1️⃣ Geração de QR Code

```
Usuário clica "Depositar"
         │
         ▼
Cliente (PHP/JS)
         │
         │ HTTP POST {userId, amount, externalId}
         ▼
Node.js /api/payment/generate-qr
         │
         ├─► PaymentController.generateQR()
         │       │
         │       ├─► Verifica se externalId já existe
         │       │   └─► Se existe: retorna dados existentes
         │       │
         │       ├─► AsaasService.createStaticQrCode()
         │       │       │
         │       │       │ HTTP POST (com access_token)
         │       │       ▼
         │       │   Asaas API /pix/qrCodes/static
         │       │       │
         │       │       │ Response: {id, encodedImage, payload}
         │       │       ▼
         │       │   Return QR Code data
         │       │
         │       └─► Prisma.transaction.create()
         │               │
         │               ▼
         │           PostgreSQL (INSERT)
         │               │
         │               └─► Return transaction
         │
         │ Response {qrcode, qrcodeImage, transactionId}
         ▼
Cliente (PHP/JS)
         │
         │ Exibe QR Code para usuário
         ▼
    Usuário
```

### 2️⃣ Verificação de Pagamento (Sob Demanda)

```
Usuário clica "Já paguei" ou "Verificar pagamento"
         │
         ▼
Cliente (PHP/JS)
         │
         │ HTTP GET /verify/:externalId
         ▼
Node.js /api/payment/verify/:externalId
         │
         ├─► PaymentController.verifyPayment()
         │       │
         │       ├─► Prisma.transaction.findUnique({externalId})
         │       │       │
         │       │       ▼
         │       │   PostgreSQL (SELECT)
         │       │       │
         │       │       └─► Return transaction
         │       │
         │       ├─► Verificar status:
         │       │   ├─► Se 'paid': retornar confirmação
         │       │   ├─► Se 'expired': retornar erro
         │       │   └─► Se 'pending': continuar verificação
         │       │
         │       ├─► AsaasService.getPixTransactions(qrCodeId)
         │       │       │
         │       │       │ HTTP GET (com access_token)
         │       │       ▼
         │       │   Asaas API /pix/transactions
         │       │       │
         │       │       │ Response: {data: [{status, value}]}
         │       │       ▼
         │       │   Return transactions
         │       │
         │       ├─► Filtrar transações pagas:
         │       │   └─► status = 'RECEIVED' | 'CONFIRMED' | 'DONE'
         │       │
         │       ├─► Se encontrou transação paga:
         │       │   ├─► Validar valor (pago >= esperado)
         │       │   └─► Prisma.transaction.update({status: 'paid'})
         │       │           │
         │       │           ▼
         │       │       PostgreSQL (UPDATE)
         │       │
         │       │ Response {paid: true/false, amount, paidAt}
         │       ▼
         Cliente (PHP/JS)
         │
         ├─► Se paid = true:
         │   └─► Liberar acesso ao usuário
         │
         └─► Se paid = false:
             └─► Exibir mensagem para tentar novamente
```

## 🗄️ Modelos de Dados

### PostgreSQL

#### Transaction
```typescript
{
  id: string (UUID)                    // Identificador único da transação
  userId: number                       // ID do usuário
  externalId: string (único)           // ID externo para vínculo com sistema cliente
  asaasQrCodeId: string (único)        // ID do QR Code no Asaas
  asaasTransactionId: string           // ID da transação PIX no Asaas
  amount: Decimal                      // Valor do pagamento
  description: string                  // Descrição do pagamento
  status: string                       // 'pending' | 'paid' | 'expired'
  qrCodePayload: string                // Payload PIX (copia e cola)
  qrCodeEncodedImage: string           // Imagem QR Code em base64
  expirationSeconds: number            // Tempo de expiração em segundos (300)
  qrCodeResponse: JSON                 // Resposta completa do Asaas
  transactionData: JSON                // Dados da transação PIX quando pago
  createdAt: DateTime                  // Data de criação
  updatedAt: DateTime                  // Data de atualização
  paidAt: DateTime                     // Data do pagamento
}
```

#### WebhookLog (mantido para compatibilidade, não utilizado)
```typescript
{
  id: string (UUID)
  eventType: string
  payload: JSON
  processed: boolean
  error: string
  createdAt: DateTime
}
```

## 🔐 Segurança

### Headers e Middlewares
- ✅ **Helmet**: Headers de segurança HTTP
- ✅ **CORS**: Controle de origens permitidas
- ✅ **JSON Parser**: Limite de 10MB
- ✅ **Timeout**: 30 segundos em todas requisições Asaas

### Validações
- ✅ **Campos obrigatórios**: userId, amount, externalId
- ✅ **Valor mínimo**: amount > 0
- ✅ **Unicidade**: externalId único por transação
- ✅ **Expiração**: Transações expiram após 5 minutos
- ✅ **Valor pago**: Valida se valor pago >= valor esperado
- ✅ **Status**: Impede reprocessamento de transações pagas

### Proteções
- ✅ **Duplicação**: Verifica externalId antes de criar nova transação
- ✅ **Autorização**: Token Asaas configurado por variável de ambiente
- ✅ **Logs detalhados**: Para auditoria e debug
- ✅ **Error handling**: Tratamento global de erros

## 📦 Estrutura de Arquivos

```
asaas-payment-api/
├── src/
│   ├── config/
│   │   └── env.ts              # Configurações de ambiente
│   ├── controllers/
│   │   └── payment.controller.ts  # Controller de pagamentos
│   ├── lib/
│   │   └── prisma.ts           # Cliente Prisma
│   ├── routes/
│   │   └── payment.routes.ts   # Rotas de pagamento
│   ├── services/
│   │   └── asaas.service.ts    # Service para API Asaas
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   └── server.ts               # Servidor Express
├── prisma/
│   └── schema.prisma           # Schema do banco
├── docker-compose.yml          # PostgreSQL container
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Deploy

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Iniciar banco de dados
docker-compose up -d

# Executar migrations
npx prisma migrate dev

# Iniciar servidor
npm run dev
```

### Produção
```bash
# Build
npm run build

# Executar migrations
npx prisma migrate deploy

# Iniciar servidor
npm start
```

### Variáveis de Ambiente (Produção)
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
ASAAS_API_KEY=seu_token_producao
ASAAS_PIX_KEY=sua_chave_pix_producao
```

## 🔍 Diferenças da Versão Anterior

### Removido ❌
1. **Webhooks do Asaas**: Não recebe notificações automáticas
2. **Notificações para PHP**: Não envia callbacks para sistemas externos
3. **Pooling automático**: Cliente controla quando verificar
4. **Multi-tenancy**: Uma única configuração Asaas
5. **Regras de organização**: Sem lógica de múltiplas organizações

### Mantido ✅
1. **Geração de QR Code**: Via API Asaas
2. **Verificação de pagamento**: Consulta sob demanda
3. **Banco de dados**: PostgreSQL com Prisma
4. **Validação de sessão**: Via externalId único
5. **Logs detalhados**: Para debug e auditoria

### Vantagens 🎯
- **Simplicidade**: Menos componentes, menos complexidade
- **Controle**: Cliente decide quando verificar pagamento
- **Manutenção**: Menos pontos de falha
- **Integração**: Mais fácil de integrar
- **Transparência**: Fluxo direto e previsível

## 📊 Monitoramento

### Logs
Todos os logs são exibidos no console com emojis:
- 🔄 Processando
- ✅ Sucesso
- ❌ Erro
- 📥 Recebendo
- 🔍 Verificando
- 💾 Salvando
- 💰 Pagamento

### Health Check
```bash
curl http://localhost:3000/health
```

### Prisma Studio
```bash
npx prisma studio
```

## 🧪 Testes

### Teste de Geração de QR Code
```bash
curl -X POST http://localhost:3000/api/payment/generate-qr \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "amount": 10.00,
    "externalId": "TEST_123_'$(date +%s)'"
  }'
```

### Teste de Verificação
```bash
curl http://localhost:3000/api/payment/verify/TEST_123_1234567890
```

---

**Versão:** 2.0.0 (Simplificada)  
**Última atualização:** 12/11/2025
