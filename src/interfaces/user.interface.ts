export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserDTO {
  email?: string;
  password?: string;
  name?: string;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
