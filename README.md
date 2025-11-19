# Asaas Payment API

API Node.js simplificada para integração com Asaas Payment Gateway (PIX).

## 🚀 Tecnologias

- Node.js + TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Docker

## 📋 Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Conta Asaas com API Key e Chave PIX

## 🔧 Instalação

1. Clone o repositório e entre na pasta:
```bash
cd asaas-payment-api
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://asaas:asaas123@localhost:5432/asaas_payment
ASAAS_API_KEY=sua_chave_api_asaas
ASAAS_PIX_KEY=sua_chave_pix_asaas
```

4. Inicie o PostgreSQL:
```bash
docker-compose up -d
```

5. Execute as migrations do Prisma:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

6. Inicie o servidor:
```bash
npm run dev
```

A API estará disponível em `http://localhost:3000`

## 📡 Endpoints

### POST /api/payment/generate-qr
Gera um QR Code PIX para pagamento

**Request:**
```json
{
  "userId": 123,
  "amount": 50.00,
  "externalId": "DEP_123_1234567890_1234",
  "description": "Depósito - R$ 50,00"
}
```

**Response:**
```json
{
  "success": true,
  "qrcode": "payload_pix_aqui",
  "qrcodeImage": "base64_image",
  "transactionId": "uuid",
  "asaasQrCodeId": "9bea9bcd...",
  "valor": 50.00
}
```

### GET /api/payment/verify/:externalId
Verifica status de um pagamento em tempo real

**Response (Pendente):**
```json
{
  "paid": false,
  "status": "pending"
}
```

**Response (Pago):**
```json
{
  "paid": true,
  "amount": 50.00,
  "paidAt": "2025-11-12T12:00:00Z",
  "status": "paid"
}
```

**Response (Expirado):**
```json
{
  "paid": false,
  "status": "expired",
  "error": "Transação expirada"
}
```

### GET /health
Verifica o status da API

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T12:00:00Z",
  "service": "asaas-payment-api",
  "version": "1.0.0"
}
```

## 🔄 Fluxo de Pagamento

1. **Geração de QR Code:**
   - Cliente chama `POST /api/payment/generate-qr`
   - Node.js cria QR Code no Asaas
   - Node.js salva transação no PostgreSQL
   - Node.js retorna QR Code para o cliente

2. **Verificação de Pagamento:**
   - Cliente chama `GET /api/payment/verify/:externalId`
   - Node.js consulta transação no banco
   - Se pendente, Node.js verifica no Asaas se foi pago
   - Node.js atualiza status e retorna para o cliente

3. **Validação de Sessão:**
   - Cada transação tem um `externalId` único
   - Transações expiram após 5 minutos (300 segundos)
   - Status possíveis: `pending`, `paid`, `expired`
   - Validação automática de valor pago vs esperado

## 🛠️ Scripts

- `npm run dev` - Inicia servidor em modo desenvolvimento
- `npm run build` - Compila TypeScript
- `npm start` - Inicia servidor em produção
- `npx prisma studio` - Abre interface visual do banco

## 📊 Banco de Dados

### Transaction
```typescript
{
  id: string (UUID)
  userId: number
  externalId: string (único)
  asaasQrCodeId: string (único)
  asaasTransactionId: string
  amount: Decimal
  description: string
  status: 'pending' | 'paid' | 'expired'
  qrCodePayload: string (PIX copia e cola)
  qrCodeEncodedImage: string (base64)
  expirationSeconds: number (300)
  qrCodeResponse: JSON
  transactionData: JSON
  createdAt: DateTime
  updatedAt: DateTime
  paidAt: DateTime
}
```

### WebhookLog (mantido para histórico)
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

## 📝 Logs

Os logs são exibidos no console com emojis para fácil identificação:
- 🔄 Processando
- ✅ Sucesso
- ❌ Erro
- 📥 Recebendo
- 🔍 Verificando
- 💾 Salvando
- 💰 Pagamento

## 🔐 Segurança

- CORS configurado
- Helmet para headers de segurança
- Validação de payloads
- Timeout em requisições (30s)
- Prevenção de duplicação de transações
- Validação de valores pagos
- Expiração automática de transações

## 🏗️ Arquitetura

A API segue uma arquitetura simples e direta:

```
Client (PHP/JavaScript)
         │
         ▼
  Express Server
         │
         ├─► Payment Controller
         │        │
         │        ├─► Asaas Service (API do Asaas)
         │        └─► Prisma (PostgreSQL)
         │
         └─► Health Check
```

**Principais Características:**
- ✅ Sem webhooks (verificação sob demanda)
- ✅ Sem pooling automático (cliente controla)
- ✅ Sem regras de organização
- ✅ Validação de sessão entre cliente e servidor
- ✅ Comunicação direta com Asaas

## 🚨 Diferenças da Versão Anterior

Esta versão foi **simplificada** e remove:

1. ❌ **Webhooks do Asaas** - Não recebe notificações automáticas
2. ❌ **Notificações para PHP** - Não notifica sistemas externos
3. ❌ **Pooling automático** - Cliente decide quando verificar
4. ❌ **Regras de organização** - Usa credenciais diretas do Asaas
5. ❌ **Multi-tenancy** - Uma única configuração Asaas

**Vantagens:**
- ✅ Mais simples de manter
- ✅ Menos pontos de falha
- ✅ Cliente tem controle total
- ✅ Fácil de integrar
- ✅ Validação de sessão clara

## 🔌 Exemplo de Integração

### JavaScript/TypeScript
```typescript
// Gerar QR Code
const response = await fetch('http://localhost:3000/api/payment/generate-qr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 123,
    amount: 50.00,
    externalId: `DEP_${userId}_${Date.now()}`
  })
});

const { qrcode, qrcodeImage, transactionId, asaasQrCodeId } = await response.json();

// Verificar pagamento (chamar quando usuário clicar em "Já paguei")
const verifyResponse = await fetch(`http://localhost:3000/api/payment/verify/${externalId}`);
const { paid, amount, paidAt } = await verifyResponse.json();

if (paid) {
  // Liberar acesso ao usuário
  console.log('Pagamento confirmado!', amount);
}
```

### PHP
```php
// Gerar QR Code
$data = [
    'userId' => 123,
    'amount' => 50.00,
    'externalId' => "DEP_123_" . time()
];

$ch = curl_init('http://localhost:3000/api/payment/generate-qr');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);

// Verificar pagamento
$ch = curl_init("http://localhost:3000/api/payment/verify/{$externalId}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$verify = json_decode($response, true);

if ($verify['paid']) {
    // Liberar acesso ao usuário
    echo "Pagamento confirmado! R$ " . $verify['amount'];
}
```

## 📞 Suporte

Em caso de problemas, verifique:

1. ✅ Credenciais do Asaas estão corretas no `.env`
2. ✅ PostgreSQL está rodando
3. ✅ Migrations foram executadas
4. ✅ Porta 3000 está disponível

Para logs detalhados, observe o console do servidor.

---

**Versão:** 2.0.0 (Simplificada)  
**Última atualização:** 12/11/2025
