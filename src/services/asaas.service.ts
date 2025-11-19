import axios, { AxiosInstance } from 'axios';

/**
 * Service para comunicação com a API do Asaas
 * Versão simplificada sem regras de organização
 */
class AsaasService {
  private api: AxiosInstance;
  private readonly baseURL = 'https://api.asaas.com/v3';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🔧 [AsaasService] Inicializado com URL:', this.baseURL);
  }

  /**
   * Configura o token de acesso
   */
  private setAccessToken(accessToken: string) {
    delete this.api.defaults.headers.common['access_token'];
    this.api.defaults.headers.common['access_token'] = accessToken;
    
    console.log('🔐 [AsaasService] Token configurado:', {
      hasToken: !!accessToken,
      tokenLength: accessToken?.length || 0,
      tokenPreview: accessToken?.substring(0, 20) + '...'
    });
  }

  /**
   * Gera QR Code estático para PIX no Asaas
   */
  async createStaticQRCode(
    accessToken: string,
    qrCodeData: {
      addressKey: string;
      description: string;
      value: number;
      format?: string;
      expirationSeconds?: number;
      allowsMultiplePayments?: boolean;
      externalReference?: string;
    }
  ): Promise<{
    success: boolean;
    id?: string;
    encodedImage?: string;
    payload?: string;
    expirationDate?: string;
    allowsMultiplePayments?: boolean;
    externalReference?: string;
    errors?: Array<{ code: string; description: string }>;
  }> {
    try {
      console.log('🔄 [AsaasService] Gerando QR Code estático:', {
        addressKey: qrCodeData.addressKey,
        value: qrCodeData.value,
        description: qrCodeData.description,
        hasToken: !!accessToken
      });

      this.setAccessToken(accessToken);
      
      const payload = {
        ...qrCodeData,
        format: qrCodeData.format || 'ALL',
        expirationSeconds: qrCodeData.expirationSeconds || 300,
        allowsMultiplePayments: qrCodeData.allowsMultiplePayments ?? false
      };

      console.log('📋 [AsaasService] Payload da requisição:', JSON.stringify(payload, null, 2));

      const response = await this.api.post('/pix/qrCodes/static', payload);

      if (response.status === 200 || response.status === 201) {
        console.log('✅ [AsaasService] QR Code gerado com sucesso:', response.data.id);
        
        return {
          success: true,
          id: response.data.id,
          encodedImage: response.data.encodedImage,
          payload: response.data.payload,
          expirationDate: response.data.expirationDate,
          allowsMultiplePayments: response.data.allowsMultiplePayments,
          externalReference: response.data.externalReference,
        };
      } else {
        console.error('❌ [AsaasService] Erro na resposta do Asaas:', response.status, response.data);
        return {
          success: false,
          errors: response.data.errors || [{ 
            code: 'UNKNOWN_ERROR', 
            description: 'Erro desconhecido na API do Asaas' 
          }]
        };
      }
    } catch (error: any) {
      console.error('❌ [AsaasService] Erro ao gerar QR Code:', error);

      if (error.response) {
        const errorData = error.response.data;
        console.error('❌ [AsaasService] Detalhes do erro da API:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: errorData
        });
        
        return {
          success: false,
          errors: errorData.errors || [{ 
            code: 'API_ERROR', 
            description: errorData.message || `Erro na API do Asaas (${error.response.status})` 
          }]
        };
      } else if (error.request) {
        console.error('❌ [AsaasService] Erro de rede');
        
        return {
          success: false,
          errors: [{ 
            code: 'NETWORK_ERROR', 
            description: 'Erro de conexão com a API do Asaas' 
          }]
        };
      } else {
        console.error('❌ [AsaasService] Erro desconhecido:', error.message);
        
        return {
          success: false,
          errors: [{ 
            code: 'UNKNOWN_ERROR', 
            description: error.message || 'Erro desconhecido' 
          }]
        };
      }
    }
  }

  /**
   * Buscar transações PIX por conciliationIdentifier
   */
  async getPixTransactions(
    accessToken: string,
    conciliationIdentifier: string
  ): Promise<{
    success: boolean;
    transactions: any[];
    totalCount: number;
    error?: string;
  }> {
    try {
      console.log('🔍 [AsaasService] Consultando transações PIX');
      console.log('URL:', `${this.baseURL}/pix/transactions?conciliationIdentifier=${conciliationIdentifier}`);
      
      this.setAccessToken(accessToken);

      const response = await this.api.get('/pix/transactions', {
        params: {
          conciliationIdentifier
        }
      });

      console.log('📥 [AsaasService] Resposta recebida:', {
        status: response.status,
        totalCount: response.data.totalCount,
        hasData: !!response.data.data,
        dataLength: response.data.data?.length || 0
      });
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('📋 [AsaasService] Transações:', JSON.stringify(response.data.data, null, 2));
      }

      return {
        success: true,
        transactions: response.data.data || [],
        totalCount: response.data.totalCount || 0
      };
    } catch (error: any) {
      console.error('❌ [AsaasService] Erro ao buscar transações PIX');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);
      
      if (error.response) {
        return {
          success: false,
          error: error.response.data.message || `Erro na API do Asaas (${error.response.status})`,
          transactions: [],
          totalCount: 0
        };
      }
      
      return {
        success: false,
        error: 'Erro de conexão com a API do Asaas',
        transactions: [],
        totalCount: 0
      };
    }
  }

  /**
   * Validar se o token de acesso é válido
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      this.setAccessToken(accessToken);
      const response = await this.api.get('/myAccount');
      return response.status === 200;
    } catch (error) {
      console.error('❌ [AsaasService] Token de acesso inválido:', error);
      return false;
    }
  }
}

const asaasService = new AsaasService();

export default asaasService;


