import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import asaasService from '../services/asaas.service';
import { env } from '../config/env';
import { GenerateQRRequest, GenerateQRResponse, VerifyPaymentResponse } from '../types';

export class PaymentController {
  async generateQR(req: Request, res: Response): Promise<void> {
    try {
      const { userId: userIdRaw, amount, externalId, description }: GenerateQRRequest = req.body;

      // Converter userId para número
      const userId = typeof userIdRaw === 'string' ? parseInt(userIdRaw, 10) : userIdRaw;

      console.log('═══════════════════════════════════════════════════');
      console.log('🔄 GERANDO QR CODE PIX');
      console.log('UserId:', userId);
      console.log('Amount:', amount);
      console.log('ExternalId:', externalId);
      console.log('═══════════════════════════════════════════════════');

      if (!userId || !amount || !externalId) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: userId, amount, externalId'
        });
        return;
      }

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'userId deve ser um número válido'
        });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'O valor deve ser maior que zero'
        });
        return;
      }

      const existingTransaction = await prisma.transaction.findUnique({
        where: { externalId }
      });

      if (existingTransaction) {
        console.log('ℹ️ Transação já existe, retornando dados existentes');
        
        const response: GenerateQRResponse = {
          success: true,
          qrcode: existingTransaction.qrCodePayload || '',
          qrcodeImage: existingTransaction.qrCodeEncodedImage || '',
          transactionId: existingTransaction.id,
          asaasQrCodeId: existingTransaction.asaasQrCodeId || '',
          valor: parseFloat(existingTransaction.amount.toString())
        };

        res.json(response);
        return;
      }

      const qrCodeData = {
        addressKey: env.ASAAS_PIX_KEY,
        description: description || `Depósito - R$ ${amount.toFixed(2)}`,
        value: amount,
        format: 'ALL' as const,
        expirationSeconds: 300,
        allowsMultiplePayments: false,
        externalReference: externalId
      };

      console.log('🔄 Criando QR Code no Asaas...');

      const qrCodeResponse = await asaasService.createStaticQRCode(
        '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjNiMzg5N2ExLTYzYmEtNGZhYi04M2EyLTRkNjI0Y2NiNzRkYzo6JGFhY2hfNzcwMDc3NzQtN2JlOC00OWZmLWExMzYtMGE0OWQ4YzkyNjI0',
        qrCodeData
      );

      if (!qrCodeResponse.success || !qrCodeResponse.id) {
        console.error('❌ Falha ao gerar QR Code:', {
          success: qrCodeResponse.success,
          hasId: !!qrCodeResponse.id,
          errors: qrCodeResponse.errors
        });

        res.status(500).json({
          success: false,
          error: `Erro ao gerar QR Code: ${qrCodeResponse.errors?.[0]?.description || 'Erro desconhecido'}`
        });
        return;
      }

      console.log('✅ QR Code criado no Asaas:', qrCodeResponse.id);
      console.log('💾 Salvando transação no banco...');

      const transaction = await prisma.transaction.create({
        data: {
          userId,
          externalId,
          asaasQrCodeId: qrCodeResponse.id,
          amount,
          description: qrCodeData.description,
          status: 'pending',
          qrCodePayload: qrCodeResponse.payload || '',
          qrCodeEncodedImage: qrCodeResponse.encodedImage || '',
          expirationSeconds: qrCodeData.expirationSeconds,
          qrCodeResponse: qrCodeResponse as any
        }
      });

      console.log('✅ Transação salva:', transaction.id);

      const response: GenerateQRResponse = {
        success: true,
        qrcode: qrCodeResponse.payload || '',
        qrcodeImage: qrCodeResponse.encodedImage || '',
        transactionId: transaction.id,
        asaasQrCodeId: qrCodeResponse.id,
        valor: amount
      };

      console.log('═══════════════════════════════════════════════════');
      console.log('✅ QR CODE GERADO COM SUCESSO');
      console.log('═══════════════════════════════════════════════════');

      res.json(response);
    } catch (error: any) {
      console.error('❌ Erro ao gerar QR Code:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao gerar QR Code'
      });
    }
  }

  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { externalId } = req.params;
      // Pegar userId do query string (enviado pelo PHP)
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

      console.log('═══════════════════════════════════════════════════');
      console.log('🔍 VERIFICANDO PAGAMENTO');
      console.log('ExternalId:', externalId);
      console.log('UserId:', userId);
      console.log('═══════════════════════════════════════════════════');

      const transaction = await prisma.transaction.findUnique({
        where: { externalId }
      });

      if (!transaction) {
        console.log('❌ Transação não encontrada');
        res.status(404).json({
          paid: false,
          error: 'Transação não encontrada'
        });
        return;
      }

      // ✅ VALIDAÇÃO DE SEGURANÇA: Verificar se a transação pertence ao usuário
      if (userId && transaction.userId !== userId) {
        console.log('❌ Acesso negado: transação não pertence ao usuário');
        console.log('Transaction userId:', transaction.userId, 'Requested userId:', userId);
        res.status(403).json({
          paid: false,
          error: 'Acesso negado: esta transação não pertence a você'
        });
        return;
      }

      console.log('✅ Transação encontrada:', {
        id: transaction.id,
        userId: transaction.userId,
        status: transaction.status,
        amount: transaction.amount,
        asaasQrCodeId: transaction.asaasQrCodeId
      });

      if (transaction.status === 'paid') {
        console.log('ℹ️ Pagamento já confirmado anteriormente');

        const response: VerifyPaymentResponse = {
          paid: true,
          amount: parseFloat(transaction.amount.toString()),
          paidAt: transaction.paidAt?.toISOString(),
          status: transaction.status
        };

        res.json(response);
        return;
      }

      const createdAt = transaction.createdAt.getTime();
      const now = Date.now();
      const expirationMs = transaction.expirationSeconds * 1000;

      if (transaction.status === 'expired' || (now - createdAt) > expirationMs) {
        console.log('❌ Transação expirada');

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'expired' }
        });

        const response: VerifyPaymentResponse = {
          paid: false,
          status: 'expired',
          error: 'Transação expirada'
        };

        res.json(response);
        return;
      }

      if (transaction.status === 'pending' && transaction.asaasQrCodeId) {
        console.log('🔄 Consultando transações PIX no Asaas...');
        console.log('ConciliationIdentifier:', transaction.asaasQrCodeId);

        const pixTransactions = await asaasService.getPixTransactions(
          '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjNiMzg5N2ExLTYzYmEtNGZhYi04M2EyLTRkNjI0Y2NiNzRkYzo6JGFhY2hfNzcwMDc3NzQtN2JlOC00OWZmLWExMzYtMGE0OWQ4YzkyNjI0',
          transaction.asaasQrCodeId
        );

        if (!pixTransactions.success) {
          console.log('❌ Erro ao consultar Asaas:', pixTransactions.error);
          res.json({
            paid: false,
            status: 'pending',
            error: pixTransactions.error
          });
          return;
        }

        console.log('📋 Transações encontradas:', pixTransactions.transactions.length);
        console.log('Transações:', JSON.stringify(pixTransactions.transactions, null, 2));

        const paidTransactions = pixTransactions.transactions.filter((tx: any) =>
          tx.status === 'RECEIVED' || tx.status === 'CONFIRMED' || tx.status === 'DONE'
        );

        console.log('💰 Transações PAGAS encontradas:', paidTransactions.length);

        if (paidTransactions.length > 0) {
          const paidTransaction = paidTransactions[0];
          const paidAmount = parseFloat(paidTransaction.value || '0');

          console.log('💵 Valor pago:', paidAmount, '/ Valor esperado:', transaction.amount);

          if (paidAmount >= parseFloat(transaction.amount.toString())) {
            console.log('✅ Valor conferido! Processando pagamento...');

            const updatedTransaction = await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: 'paid',
                paidAt: new Date(),
                asaasTransactionId: paidTransaction.id || paidTransaction.endToEndIdentifier,
                transactionData: paidTransaction as any
              }
            });

            console.log('═══════════════════════════════════════════════════');
            console.log('✅ PAGAMENTO CONFIRMADO!');
            console.log('═══════════════════════════════════════════════════');

            const response: VerifyPaymentResponse = {
              paid: true,
              amount: paidAmount,
              paidAt: updatedTransaction.paidAt?.toISOString(),
              status: 'paid'
            };

            res.json(response);
            return;
          } else {
            console.log('⚠️ Valor pago insuficiente');
            res.json({
              paid: false,
              status: 'pending',
              error: `Valor pago (R$ ${paidAmount.toFixed(2)}) é menor que o esperado (R$ ${transaction.amount})`
            });
            return;
          }
        }
      }

      console.log('ℹ️ Nenhum pagamento identificado ainda');
      const response: VerifyPaymentResponse = {
        paid: false,
        status: 'pending'
      };

      res.json(response);
    } catch (error: any) {
      console.error('❌ Erro ao verificar pagamento:', error);
      res.status(500).json({
        paid: false,
        error: error.message || 'Erro interno ao verificar pagamento'
      });
    }
  }
}

export default new PaymentController();

