import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { CreateUserDTO, UpdateUserDTO, UserResponse } from '../interfaces/user.interface';

const BCRYPT_ROUNDS = 10;

const toUserResponse = (user: {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getAllUsers = async (): Promise<UserResponse[]> => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return users.map(toUserResponse);
};

export const getUserById = async (id: string): Promise<UserResponse | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user ? toUserResponse(user) : null;
};

export const createUser = async (data: CreateUserDTO): Promise<UserResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('A user with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return toUserResponse(user);
};

export const updateUser = async (id: string, data: UpdateUserDTO): Promise<UserResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  if (data.email && data.email !== existingUser.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailTaken) {
      throw new Error('A user with this email already exists');
    }
  }

  const updateData: {
    email?: string;
    password?: string;
    name?: string;
    isActive?: boolean;
  } = {};

  if (data.email) updateData.email = data.email;
  if (data.name) updateData.name = data.name;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return toUserResponse(user);
};

export const deleteUser = async (id: string): Promise<void> => {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  await prisma.user.delete({
    where: { id },
  });
};
