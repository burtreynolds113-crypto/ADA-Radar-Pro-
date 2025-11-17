import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSchema } from './db.js';
import { clerkMiddleware } from './clerkMiddleware.js';
import billingRouter, { stripeWebhookHandler } from './routes/billing.js';
import sitesRouter from './routes/sites.js';

// Load environment variables
dotenv.config();

// Initialize the SQLite schema
initSchema();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for the frontend domain
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Stripe webhook route must use raw body parser
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// JSON body parser for other routes
app.use(express.json());

// Apply Clerk middleware for authenticated routes
app.use('/api', clerkMiddleware);

// Mount routers
app.use('/api/billing', billingRouter);
app.use('/api/sites', sitesRouter);

// Health check route
app.get('/', (req, res) => {
  res.send('ADA Radar API running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});