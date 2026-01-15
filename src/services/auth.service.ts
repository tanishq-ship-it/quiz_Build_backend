import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt';
import { LoginDTO, AuthResponse, TokenPayload } from '../interfaces/auth.interface';

export const login = async (data: LoginDTO): Promise<AuthResponse> => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated. Contact an administrator.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
};
