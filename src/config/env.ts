import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT ?? '4000';

export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const DIRECT_URL = process.env.DIRECT_URL ?? '';

// Clerk Backend API
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? '';

// RevenueCat API
export const REVENUECAT_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY ?? '';


