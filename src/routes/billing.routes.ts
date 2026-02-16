import { Router } from 'express';
import {
  getSubscriptionPlans,
  subscribe,
  cancelSubscription,
  getSubscription,
  addPaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
  getInvoices,
  getPaymentHistory,
  createPaymentIntent,
  handleWebhook,
} from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Webhook route (no auth required)
router.post('/webhook', handleWebhook);

// Authenticated routes
router.use(authenticate);

router.get('/plans', getSubscriptionPlans);
router.post('/subscribe', subscribe);
router.post('/cancel-subscription', cancelSubscription);
router.get('/subscription', getSubscription);

router.post('/payment-methods', addPaymentMethod);
router.get('/payment-methods', getPaymentMethods);
router.delete('/payment-methods/:paymentMethodId', deletePaymentMethod);

router.get('/invoices', getInvoices);
router.get('/payments', getPaymentHistory);
router.post('/create-payment-intent', createPaymentIntent);

export default router;

