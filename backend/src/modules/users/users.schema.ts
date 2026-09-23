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

export const UserPaginationMetadataSchema = z
  .object({
    total_records: z.number().openapi({ example: 4 }),
    current_page: z.number().openapi({ example: 1 }),
    total_pages: z.number().openapi({ example: 1 }),
    limit: z.number().openapi({ example: 20 }),
  })
  .openapi('UserPaginationMetadata');

export const UsersQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .positive()
      .default(1)
      .openapi({ example: 1, description: 'Page number (1-indexed)' }),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .default(20)
      .openapi({ example: 20, description: 'Records per page limit (default 20, max 100)' }),
    search: z
      .string()
      .optional()
      .openapi({ example: 'operator', description: 'Search across username and email' }),
    role: z
      .enum(['Operator', 'Supervisor', 'Admin'])
      .optional()
      .openapi({ example: 'Operator', description: 'Filter by role name' }),
    is_active: z.coerce
      .boolean()
      .optional()
      .openapi({ example: true, description: 'Filter by account active status' }),
  })
  .openapi('UsersQuery');

export const UsersListResponseSchema = z
  .object({
    data: z.array(UserItemSchema).openapi({ description: 'List of all system users' }),
    pagination: UserPaginationMetadataSchema,
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

export const UpdateUserRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Invalid email address format')
      .max(100, 'Email must not exceed 100 characters')
      .optional()
      .openapi({ example: 'operator2@hirose.co.id', description: 'Updated email address' }),
    role: z
      .enum(['Operator', 'Supervisor', 'Admin'])
      .optional()
      .openapi({ example: 'Supervisor', description: 'Updated role assigned to user' }),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .optional()
      .openapi({ example: 'NewPassword123!', description: 'Optional new password' }),
  })
  .openapi('UpdateUserRequest');

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Error message description' }),
    issues: z.array(z.any()).optional(),
  })
  .openapi('UserErrorResponse');

export type UserItem = z.infer<typeof UserItemSchema>;
export type UsersQueryInput = z.infer<typeof UsersQuerySchema>;
export type CreateUserInput = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusRequestSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserRequestSchema>;

