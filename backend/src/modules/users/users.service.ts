import { eq, asc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, roles } from '../../db/schema.js';
import { hashPassword } from '../../utils/password.js';
import type {
  UserItem,
  CreateUserInput,
  UpdateUserStatusInput,
} from './users.schema.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

function formatUserItem(row: any): UserItem {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role_id: row.role_id,
    role: row.role?.name ?? row.role ?? '',
    is_active: row.is_active,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

/**
 * Retrieves all registered users with their assigned role name (US-USR-01, TEST-RBAC-15).
 * Explicitly excludes password_hash from the query projection to prevent credential leakage.
 */
export async function getAllUsers(): Promise<UserItem[]> {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role_id: users.role_id,
      role: roles.name,
      is_active: users.is_active,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(users)
    .innerJoin(roles, eq(users.role_id, roles.id))
    .orderBy(asc(users.id));

  return result.map(formatUserItem);
}

/**
 * Creates a new user with hashed password and active status (US-USR-02).
 * Verifies username and email uniqueness before insertion.
 */
export async function createUser(input: CreateUserInput): Promise<UserItem> {
  // Check if username is taken
  const existingUsername = await db.query.users.findFirst({
    where: eq(users.username, input.username),
  });
  if (existingUsername) {
    throw new HttpError(409, 'Username is already taken');
  }

  // Check if email is already registered
  const existingEmail = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });
  if (existingEmail) {
    throw new HttpError(409, 'Email is already registered');
  }

  // Resolve role
  const roleRecord = await db.query.roles.findFirst({
    where: eq(roles.name, input.role),
  });
  if (!roleRecord) {
    throw new HttpError(400, 'Invalid role specified');
  }

  // Hash password securely (NFR-SEC-01)
  const password_hash = await hashPassword(input.password);

  const [inserted] = await db
    .insert(users)
    .values({
      username: input.username,
      email: input.email,
      password_hash,
      role_id: roleRecord.id,
      is_active: true,
    })
    .returning();

  return {
    id: inserted.id,
    username: inserted.username,
    email: inserted.email,
    role_id: inserted.role_id,
    role: roleRecord.name,
    is_active: inserted.is_active,
    created_at: inserted.created_at.toISOString(),
    updated_at: inserted.updated_at.toISOString(),
  };
}

/**
 * Soft-activates or soft-deactivates a user (US-USR-03, TEST-RBAC-17).
 * Prevents an admin from accidentally deactivating their own account.
 */
export async function updateUserStatus(
  currentUserId: number,
  targetUserId: number,
  input: UpdateUserStatusInput
): Promise<UserItem> {
  // Defensive guard: Admin cannot deactivate themselves
  if (currentUserId === targetUserId && !input.is_active) {
    throw new HttpError(400, 'Cannot deactivate your own admin account');
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    with: { role: true },
  });

  if (!existing) {
    throw new HttpError(404, 'User not found');
  }

  const [updated] = await db
    .update(users)
    .set({
      is_active: input.is_active,
      updated_at: new Date(),
    })
    .where(eq(users.id, targetUserId))
    .returning();

  return {
    id: updated.id,
    username: updated.username,
    email: updated.email,
    role_id: updated.role_id,
    role: existing.role.name,
    is_active: updated.is_active,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
  };
}
