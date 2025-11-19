export interface GenerateQRRequest {
  userId: number;
  amount: number;
  externalId: string;
  description?: string;
}

export interface GenerateQRResponse {
  success: boolean;
  qrcode: string;
  qrcodeImage: string;
  transactionId: string;
  asaasQrCodeId: string;
  valor: number;
  error?: string;
}

export interface VerifyPaymentResponse {
  paid: boolean;
  amount?: number;
  paidAt?: string;
  status?: string;
  error?: string;
}

export interface WebhookPayload {
  event: string;
  external_id: string;
  amount: number;
  transaction_id: string;
  user_id: number;
  paid_at: string;
}

export interface AsaasQRCodeRequest {
  addressKey: string;
  description: string;
  value: number;
  format?: string;
  expirationSeconds?: number;
  allowsMultiplePayments?: boolean;
  externalReference?: string;
}

export interface AsaasQRCodeResponse {
  success: boolean;
  id?: string;
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
  allowsMultiplePayments?: boolean;
  externalReference?: string;
  errors?: Array<{ code: string; description: string }>;
}

export interface AsaasPixTransaction {
  id: string;
  endToEndIdentifier: string;
  transactionReceiptUrl: string;
  value: number;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
  effectiveDate: string;
  dateCreated: string;
}


