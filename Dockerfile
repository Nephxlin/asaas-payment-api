# Dockerfile para asaas-payment-api (Node.js)
FROM node:18-alpine

# Instalar dependências para Prisma
RUN apk add --no-cache openssl libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json yarn.lock ./

# Instalar dependências
RUN yarn install --frozen-lockfile --production=false

# Copiar o resto do código
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build do TypeScript
RUN yarn build

# Remover devDependencies para reduzir tamanho da imagem
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

# Expor porta da aplicação
EXPOSE 3000

# Variáveis de ambiente padrão (serão sobrescritas pelo Coolify)
ENV NODE_ENV=production
ENV PORT=3000

# Executar migrations e iniciar aplicação
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]


