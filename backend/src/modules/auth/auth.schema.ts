import { z } from '@hono/zod-openapi';

export const LoginRequestSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username or email is required')
      .openapi({
        description: 'Username or registered email of the user',
        example: 'operator1',
      }),
    password: z
      .string()
      .min(1, 'Password is required')
      .openapi({
        description: 'Plaintext password to authenticate',
        example: 'Password123!',
      }),
  })
  .openapi('LoginRequest');

export const LoginResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Login successful' }),
    token: z.string().openapi({ description: 'Signed JWT access token' }),
    user: z.object({
      id: z.number().openapi({ example: 1 }),
      username: z.string().openapi({ example: 'operator1' }),
      email: z.string().openapi({ example: 'operator1@hirose.co.id' }),
      role: z.string().openapi({ example: 'Operator' }),
    }),
  })
  .openapi('LoginResponse');

export const UserProfileResponseSchema = z
  .object({
    user: z.object({
      id: z.number().openapi({ example: 1 }),
      username: z.string().openapi({ example: 'operator1' }),
      email: z.string().openapi({ example: 'operator1@hirose.co.id' }),
      role: z.string().openapi({ example: 'Operator' }),
      is_active: z.boolean().openapi({ example: true }),
    }),
  })
  .openapi('UserProfileResponse');

export const LogoutResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Logged out successfully' }),
  })
  .openapi('LogoutResponse');

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Invalid credentials' }),
  })
  .openapi('ErrorResponse');

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
