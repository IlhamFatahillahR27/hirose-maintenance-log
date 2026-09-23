import { z } from '@hono/zod-openapi';

export const UserItemSchema = z
  .object({
    id: z.number().openapi({ example: 1, description: 'Unique user identifier' }),
    username: z.string().openapi({ example: 'operator1', description: 'Username' }),
    email: z.string().openapi({ example: 'operator1@hirose.co.id', description: 'User corporate email' }),
    role_id: z.number().openapi({ example: 1, description: 'Foreign key to roles table' }),
    role: z.string().openapi({ example: 'Operator', description: 'Role name' }),
    is_active: z.boolean().openapi({ example: true, description: 'Account status (active or soft-deactivated)' }),
    created_at: z.string().openapi({ example: '2026-09-23T10:00:00.000Z' }),
    updated_at: z.string().openapi({ example: '2026-09-23T10:00:00.000Z' }),
  })
  .openapi('UserItem');

export const UsersListResponseSchema = z
  .object({
    data: z.array(UserItemSchema).openapi({ description: 'List of all system users' }),
  })
  .openapi('UsersListResponse');

export const SingleUserResponseSchema = z
  .object({
    data: UserItemSchema,
  })
  .openapi('SingleUserResponse');

export const CreateUserRequestSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        'Username can only contain alphanumeric characters, underscores, dots, or hyphens'
      )
      .openapi({ example: 'operator2', description: 'Unique username' }),
    email: z
      .string()
      .trim()
      .email('Invalid email address format')
      .max(100, 'Email must not exceed 100 characters')
      .openapi({ example: 'operator2@hirose.co.id', description: 'Unique email address' }),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .openapi({ example: 'Password123!', description: 'Initial account password' }),
    role: z
      .enum(['Operator', 'Supervisor', 'Admin'])
      .openapi({ example: 'Operator', description: 'Role name assigned to user' }),
  })
  .openapi('CreateUserRequest');

export const UpdateUserStatusRequestSchema = z
  .object({
    is_active: z.boolean().openapi({
      example: false,
      description: 'Account active toggle (true to activate, false to deactivate)',
    }),
  })
  .openapi('UpdateUserStatusRequest');

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Error message description' }),
    issues: z.array(z.any()).optional(),
  })
  .openapi('UserErrorResponse');

export type UserItem = z.infer<typeof UserItemSchema>;
export type CreateUserInput = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusRequestSchema>;
