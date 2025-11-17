import dotenv from 'dotenv';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

// Load environment variables
dotenv.config();

// Initialize Clerk middleware. We provide the secret key via env vars.
export const clerkMiddleware = ClerkExpressWithAuth({
  secretKey: process.env.CLERK_SECRET_KEY
});