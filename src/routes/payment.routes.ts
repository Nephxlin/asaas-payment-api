import { Router } from 'express';
import paymentController from '../controllers/payment.controller';

const router = Router();

// POST /api/payment/generate-qr
router.post('/generate-qr', (req, res) => paymentController.generateQR(req, res));

// GET /api/payment/verify/:externalId
router.get('/verify/:externalId', (req, res) => paymentController.verifyPayment(req, res));

export default router;

