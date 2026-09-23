import { eq, asc, and, or, ilike, count, ne, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, roles } from '../../db/schema.js';
import { hashPassword } from '../../utils/password.js';
import type {
  UserItem,
  UsersQueryInput,
  CreateUserInput,
  UpdateUserStatusInput,
  UpdateUserInput,
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
 * Retrieves paginated registered users list with search and filters (US-USR-01, TEST-RBAC-15).
 * Explicitly excludes password_hash from the query projection to prevent credential leakage.
 */
export async function getAllUsers(
  query: UsersQueryInput = { page: 1, limit: 20 }
): Promise<{
  data: UserItem[];
  pagination: {
    total_records: number;
    current_page: number;
    total_pages: number;
    limit: number;
  };
}> {
  const whereConditions: SQL[] = [];

  if (query.role) {
    whereConditions.push(eq(roles.name, query.role));
  }

  if (query.is_active !== undefined) {
    whereConditions.push(eq(users.is_active, query.is_active));
  }

  if (query.search && query.search.trim()) {
    const term = `%${query.search.trim()}%`;
    const searchCond = or(
      ilike(users.username, term),
      ilike(users.email, term)
    );
    if (searchCond) {
      whereConditions.push(searchCond);
    }
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const [countResult] = await db
    .select({ count: count() })
    .from(users)
    .innerJoin(roles, eq(users.role_id, roles.id))
    .where(whereClause);

  const total_records = Number(countResult?.count ?? 0);
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;
  const total_pages = Math.ceil(total_records / limit) || 1;

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
    .where(whereClause)
    .orderBy(asc(users.id))
    .limit(limit)
    .offset(offset);

  return {
    data: result.map(formatUserItem),
    pagination: {
      total_records,
      current_page: page,
      total_pages,
      limit,
    },
  };
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

/**
 * Updates a user's email, role, and/or password (FR-USR-03, BRD 3.2).
 * Restricted to Admin role.
 */
export async function updateUser(
  targetUserId: number,
  input: UpdateUserInput
): Promise<UserItem> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    with: { role: true },
  });

  if (!existing) {
    throw new HttpError(404, 'User not found');
  }

  const updateData: Record<string, any> = {
    updated_at: new Date(),
  };

  if (input.email && input.email !== existing.email) {
    const emailExists = await db.query.users.findFirst({
      where: and(eq(users.email, input.email), ne(users.id, targetUserId)),
    });
    if (emailExists) {
      throw new HttpError(409, 'Email is already registered');
    }
    updateData.email = input.email;
  }

  let finalRole = existing.role.name;
  if (input.role) {
    const roleRecord = await db.query.roles.findFirst({
      where: eq(roles.name, input.role),
    });
    if (!roleRecord) {
      throw new HttpError(400, 'Invalid role specified');
    }
    updateData.role_id = roleRecord.id;
    finalRole = roleRecord.name;
  }

  if (input.password && input.password.trim()) {
    updateData.password_hash = await hashPassword(input.password);
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, targetUserId))
    .returning();

  return {
    id: updated.id,
    username: updated.username,
    email: updated.email,
    role_id: updated.role_id,
    role: finalRole,
    is_active: updated.is_active,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
  };
}

