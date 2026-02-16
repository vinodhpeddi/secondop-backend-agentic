import { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export const getSubscriptionPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC');

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const subscribe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId, paymentMethodId } = req.body;
    const userId = req.user!.id;

    const planResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
    if (planResult.rows.length === 0) {
      throw new AppError('Plan not found', 404);
    }

    const plan = planResult.rows[0];

    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: paymentMethodId,
      items: [{ price: plan.stripe_price_id }],
    });

    const result = await query(
      `INSERT INTO user_subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, planId, subscription.id, 'active', new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000)]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const subResult = await query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (subResult.rows.length === 0) {
      throw new AppError('No active subscription found', 404);
    }

    const subscription = subResult.rows[0];
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    await query(
      'UPDATE user_subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', subscription.id]
    );

    res.json({
      status: 'success',
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT us.*, sp.name as plan_name, sp.price, sp.features
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1 AND us.status = 'active'`,
      [userId]
    );

    res.json({
      status: 'success',
      data: result.rows[0] || null,
    });
  } catch (error) {
    next(error);
  }
};

export const addPaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { stripePaymentMethodId, isDefault } = req.body;
    const userId = req.user!.id;

    const result = await query(
      `INSERT INTO payment_methods (user_id, stripe_payment_method_id, is_default)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, stripePaymentMethodId, isDefault || false]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentMethods = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await query('SELECT * FROM payment_methods WHERE user_id = $1', [userId]);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentMethodId } = req.params;
    await query('DELETE FROM payment_methods WHERE id = $1', [paymentMethodId]);

    res.json({
      status: 'success',
      message: 'Payment method deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const createPaymentIntent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
    });

    res.json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        break;
      case 'subscription.updated':
        // Handle subscription update
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

