// Read env var lazily to ensure dotenv has loaded
const getClerkSecretKey = () => process.env.CLERK_SECRET_KEY || '';

export interface ClerkUser {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: {
      status: string;
    };
  }>;
  primary_email_address_id: string;
  created_at: number;
}

export interface ClerkEmailAddress {
  id: string;
  email_address: string;
  user_id: string;
  verification: {
    status: string;
  };
}

// ========== CREATE CLERK USER (without username) ==========

export const createClerkUser = async (email: string): Promise<ClerkUser | null> => {
  console.log('Creating Clerk user for:', email);
  console.log('CLERK_SECRET_KEY loaded:', getClerkSecretKey() ? 'Yes (length: ' + getClerkSecretKey().length + ')' : 'NO - MISSING!');

  try {
    const response = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getClerkSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: [email],
        skip_password_requirement: true,
      }),
    });

    const user = await response.json();

    if (!response.ok) {
      console.error('Error creating Clerk user:', JSON.stringify(user, null, 2));
      return null;
    }

    console.log('Clerk user created successfully!');
    console.log('Clerk User ID:', user.id);
    console.log('Primary Email:', user.email_addresses?.[0]?.email_address);

    return user as ClerkUser;
  } catch (error) {
    console.error('Clerk request error:', error instanceof Error ? error.message : error);
    return null;
  }
};

// ========== UPDATE CLERK USER EMAIL (add new email as primary, keep same user ID) ==========

export const updateClerkUserEmail = async (
  userId: string,
  newEmail: string
): Promise<ClerkEmailAddress | null> => {
  console.log('Updating email for Clerk user:', userId);
  console.log('New email:', newEmail);

  try {
    // Create new email address (verified + primary)
    const response = await fetch('https://api.clerk.com/v1/email_addresses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getClerkSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        email_address: newEmail,
        verified: true,
        primary: true,
      }),
    });

    const emailData = await response.json();

    if (!response.ok) {
      console.error('Error updating Clerk email:', JSON.stringify(emailData, null, 2));
      return null;
    }

    console.log('Clerk email updated successfully!');
    console.log('New Email:', emailData.email_address);
    console.log('Email ID:', emailData.id);

    return emailData as ClerkEmailAddress;
  } catch (error) {
    console.error('Clerk request error:', error instanceof Error ? error.message : error);
    return null;
  }
};

// ========== DELETE OLD EMAIL ADDRESS ==========

export const deleteClerkEmailAddress = async (emailAddressId: string): Promise<boolean> => {
  console.log('Deleting Clerk email address:', emailAddressId);

  try {
    const response = await fetch(`https://api.clerk.com/v1/email_addresses/${emailAddressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getClerkSecretKey()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error deleting Clerk email:', JSON.stringify(errorData, null, 2));
      return false;
    }

    console.log('Clerk email address deleted successfully!');
    return true;
  } catch (error) {
    console.error('Clerk request error:', error instanceof Error ? error.message : error);
    return false;
  }
};

// ========== GET CLERK USER ==========

export const getClerkUser = async (userId: string): Promise<ClerkUser | null> => {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getClerkSecretKey()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Error getting Clerk user');
      return null;
    }

    return await response.json() as ClerkUser;
  } catch (error) {
    console.error('Clerk request error:', error instanceof Error ? error.message : error);
    return null;
  }
};

// ========== CREATE SIGN-IN TOKEN (for web-to-app auto-login) ==========

export const createSignInToken = async (userId: string): Promise<string | null> => {
  console.log('Creating sign-in token for user:', userId);

  try {
    const response = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getClerkSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        expires_in_seconds: 60 * 60 * 24 * 7, // 1 week
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error creating sign-in token:', JSON.stringify(data, null, 2));
      return null;
    }

    console.log('Sign-in token created successfully!');
    return data.token;
  } catch (error) {
    console.error('Clerk sign-in token error:', error instanceof Error ? error.message : error);
    return null;
  }
};
