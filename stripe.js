import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Stripe client with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Export price IDs for the subscription plans. These values should be defined
// in your .env or Replit secrets for each plan's price ID created in Stripe.
export const PLAN_PRICE_IDS = {
  solo: process.env.STRIPE_PRICE_SOLO,
  agency: process.env.STRIPE_PRICE_AGENCY,
  pro: process.env.STRIPE_PRICE_PRO
};