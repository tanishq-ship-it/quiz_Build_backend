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
   * Find a Clerk user by email address
   */
  async findUserByEmail(email: string): Promise<ClerkUserResponse | null> {
    if (!CLERK_SECRET_KEY) {
      console.error('[Clerk] Secret key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const users = await response.json() as ClerkUserResponse[];
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('[Clerk] Find user by email error:', error);
      return null;
    }
  },

  /**
   * Create or get existing user by email
   * Returns existing user if email already exists, otherwise creates new user
   */
  async getOrCreateUser(email: string): Promise<CreateClerkUserResult> {
    // First check if user exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      console.log(`[Clerk] User already exists for email: ${email}`);
      return {
        success: true,
        clerkUserId: existingUser.id,
        email: existingUser.email_addresses?.[0]?.email_address,
      };
    }

    // Create new user if doesn't exist
    return this.createUser(email);
  },

  /**
   * Update a Clerk user's email address
   * This adds a new email and sets it as primary
   */
  async updateUserEmail(clerkUserId: string, newEmail: string): Promise<CreateClerkUserResult> {
    if (!CLERK_SECRET_KEY) {
      console.error('[Clerk] Secret key not configured');
      return { success: false, error: 'Clerk secret key not configured' };
    }

    try {
      // Step 1: Create new email address for the user
      // Correct endpoint: POST /email_addresses
      console.log(`[Clerk] Adding email ${newEmail} to user ${clerkUserId}`);
      const createEmailResponse = await fetch(
        'https://api.clerk.com/v1/email_addresses',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: clerkUserId,
            email_address: newEmail,
            verified: true,  // Mark as verified since we control the flow
            primary: true,   // Set as primary email
          }),
        }
      );

      console.log(`[Clerk] Response status: ${createEmailResponse.status}`);

      // Safely parse response - might be empty or non-JSON
      let emailData: Record<string, unknown> = {};
      const responseText = await createEmailResponse.text();
      if (responseText) {
        try {
          emailData = JSON.parse(responseText);
        } catch {
          console.error('[Clerk] Non-JSON response:', responseText);
        }
      }

      if (!createEmailResponse.ok) {
        // If email already exists on this user, that's fine
        const errors = emailData.errors as Array<{ code?: string; message?: string }> | undefined;
        if (errors?.[0]?.code === 'form_identifier_exists') {
          console.log('[Clerk] Email already exists on user, skipping update');
          return { success: true, clerkUserId, email: newEmail };
        }
        console.error('[Clerk] Failed to add email:', emailData);
        return {
          success: false,
          error: errors?.[0]?.message || `Failed to update email (${createEmailResponse.status})`
        };
      }

      console.log(`[Clerk] Email added for user ${clerkUserId}: ${newEmail}`);

      // Step 2: Get the email ID from response and set it as primary
      const emailId = (emailData as { id?: string }).id;
      if (emailId) {
        // Set this email as primary
        const updateUserResponse = await fetch(
          `https://api.clerk.com/v1/users/${clerkUserId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              primary_email_address_id: emailId,
            }),
          }
        );

        if (updateUserResponse.ok) {
          console.log(`[Clerk] Email set as primary for user ${clerkUserId}`);
        } else {
          console.warn('[Clerk] Could not set email as primary');
        }
      }

      return {
        success: true,
        clerkUserId,
        email: newEmail,
      };
    } catch (error) {
      console.error('[Clerk] Update email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
