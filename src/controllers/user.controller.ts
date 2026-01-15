import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { CreateUserDTO, UpdateUserDTO } from '../interfaces/user.interface';

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    res.status(500).json({ error: message });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    res.status(500).json({ error: message });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body as CreateUserDTO;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const user = await userService.createUser({ email, password, name });
    res.status(201).json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    res.status(400).json({ error: message });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as UpdateUserDTO;

    const user = await userService.updateUser(id, data);
    res.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    const status = message === 'User not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    const status = message === 'User not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};
