# 🚀 Quick Start - Asaas Payment API

Guia rápido para começar a usar a API em 5 minutos.

## 📋 Requisitos

- Node.js 18+ instalado
- Docker e Docker Compose instalados
- Conta Asaas com:
  - API Key (obtida no painel Asaas)
  - Chave PIX cadastrada

## ⚡ Instalação Rápida

### 1. Instalar Dependências
```bash
cd asaas-payment-api
npm install
```

### 2. Configurar Ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais:
```bash
ASAAS_API_KEY=sua_chave_api_asaas
ASAAS_PIX_KEY=sua_chave_pix_asaas
```

### 3. Iniciar Banco de Dados
```bash
docker-compose up -d
```

### 4. Executar Migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Iniciar Servidor
```bash
npm run dev
```

✅ API rodando em `http://localhost:3000`

## 🧪 Testar

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T...",
  "service": "asaas-payment-api",
  "version": "1.0.0"
}
```

### 2. Gerar QR Code
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
  "transactionId": "uuid-aqui",
  "asaasQrCodeId": "qrc_xxx",
  "valor": 10.00
}
```

### 3. Verificar Pagamento
```bash
curl http://localhost:3000/api/payment/verify/TEST_1234567890
```

Resposta (pendente):
```json
{
  "paid": false,
  "status": "pending"
}
```

## 📱 Exemplo de Integração

### JavaScript
```javascript
// Gerar QR Code
async function gerarQRCode(userId, valor) {
  const response = await fetch('http://localhost:3000/api/payment/generate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId,
      amount: valor,
      externalId: `DEP_${userId}_${Date.now()}`
    })
  });
  
  const data = await response.json();
  return data;
}

// Verificar Pagamento
async function verificarPagamento(externalId) {
  const response = await fetch(
    `http://localhost:3000/api/payment/verify/${externalId}`
  );
  
  const data = await response.json();
  return data.paid;
}

// Uso
const qr = await gerarQRCode(123, 50.00);
console.log('QR Code:', qr.qrcode);
console.log('Imagem:', qr.qrcodeImage);

// Verificar (quando usuário clicar "Já paguei")
const pago = await verificarPagamento(qr.transactionId);
if (pago) {
  console.log('Pagamento confirmado!');
}
```

### PHP
```php
<?php

// Gerar QR Code
function gerarQRCode($userId, $valor) {
    $data = [
        'userId' => $userId,
        'amount' => $valor,
        'externalId' => "DEP_{$userId}_" . time()
    ];

    $ch = curl_init('http://localhost:3000/api/payment/generate-qr');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

// Verificar Pagamento
function verificarPagamento($externalId) {
    $ch = curl_init("http://localhost:3000/api/payment/verify/{$externalId}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    return $data['paid'];
}

// Uso
$qr = gerarQRCode(123, 50.00);
echo "QR Code: " . $qr['qrcode'] . "\n";
echo "Imagem: " . $qr['qrcodeImage'] . "\n";

// Verificar (quando usuário clicar "Já paguei")
if (verificarPagamento($qr['transactionId'])) {
    echo "Pagamento confirmado!\n";
    // Liberar acesso ao usuário
}
?>
```

## 🔧 Comandos Úteis

```bash
# Ver logs do servidor
npm run dev

# Ver dados do banco (Prisma Studio)
npx prisma studio

# Recriar banco de dados
npx prisma migrate reset

# Ver logs do PostgreSQL
docker-compose logs -f

# Parar banco de dados
docker-compose down
```

## 🐛 Problemas Comuns

### Erro: "Connection refused"
**Solução:** Verifique se o PostgreSQL está rodando:
```bash
docker-compose ps
docker-compose up -d
```

### Erro: "Invalid API key"
**Solução:** Verifique suas credenciais no `.env`:
- API Key deve começar com `$aact_...` (produção) ou `$aact_...` (sandbox)
- Chave PIX deve ser uma chave válida cadastrada no Asaas

### Erro: "Port 3000 already in use"
**Solução:** Altere a porta no `.env`:
```bash
PORT=3001
```

### Transação expirando muito rápido
**Solução:** Por padrão, QR Codes expiram em 5 minutos (300 segundos).
Para alterar, edite `payment.controller.ts`:
```typescript
expirationSeconds: 600, // 10 minutos
```

## 📚 Próximos Passos

1. ✅ Integre com seu sistema PHP/JavaScript
2. ✅ Teste com pagamentos reais (use sandbox primeiro!)
3. ✅ Configure CORS adequado para seu domínio
4. ✅ Adicione autenticação/autorização se necessário
5. ✅ Configure logs para produção
6. ✅ Faça deploy (Railway, Render, AWS, etc)

## 🎯 Fluxo Completo

```
1. Cliente solicita depósito
   ↓
2. Gerar QR Code via API
   ↓
3. Exibir QR Code para usuário
   ↓
4. Usuário paga no app do banco
   ↓
5. Usuário clica "Já paguei"
   ↓
6. Verificar pagamento via API
   ↓
7. Se pago: liberar acesso
   Se não: pedir para aguardar
```

## 🆘 Suporte

Para mais informações:
- 📖 [README.md](./README.md) - Documentação completa
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura detalhada
- 🔧 [SETUP.md](./SETUP.md) - Guia de instalação passo a passo

---

**Pronto para começar!** 🚀
