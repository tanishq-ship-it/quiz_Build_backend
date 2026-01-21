import { CLERK_SECRET_KEY } from '../config/env';

interface ClerkUserResponse {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: {
      status: string;
    };
  }>;
  username: string | null;
  created_at: number;
}

interface CreateClerkUserResult {
  success: boolean;
  clerkUserId?: string;
  email?: string;
  error?: string;
}

export const clerkService = {
  /**
   * Creates a Clerk user programmatically using the Backend API
   * This creates a user without requiring them to go through the auth flow
   */
  async createUser(email: string): Promise<CreateClerkUserResult> {
    if (!CLERK_SECRET_KEY) {
      console.error('[Clerk] Secret key not configured');
      return { success: false, error: 'Clerk secret key not configured' };
    }

    try {
      const response = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: [email],
          skip_password_requirement: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Clerk] Failed to create user:', data);
        return {
          success: false,
          error: data.errors?.[0]?.message || 'Failed to create Clerk user'
        };
      }

      const user = data as ClerkUserResponse;

      return {
        success: true,
        clerkUserId: user.id,
        email: user.email_addresses?.[0]?.email_address,
      };
    } catch (error) {
      console.error('[Clerk] Request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Get a Clerk user by their ID
   */
  async getUser(clerkUserId: string): Promise<ClerkUserResponse | null> {
    if (!CLERK_SECRET_KEY) {
      console.error('[Clerk] Secret key not configured');
      return null;
    }

    try {
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Clerk] Get user error:', error);
      return null;
    }
  },

  /**
   * Delete a Clerk user
   */
  async deleteUser(clerkUserId: string): Promise<boolean> {
    if (!CLERK_SECRET_KEY) {
      console.error('[Clerk] Secret key not configured');
      return false;
    }

    try {
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[Clerk] Delete user error:', error);
      return false;
    }
  },
};
