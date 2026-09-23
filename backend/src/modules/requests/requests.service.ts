import { and, eq, or, ilike, desc, count, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/index.js';
import { maintenanceRequests, machines, users } from '../../db/schema.js';
import type { AuthUser } from '../../types/context.js';
import type {
  CreateRequestInput,
  UpdateRequestInput,
  ReviewRequestInput,
  RequestQueryInput,
  MaintenanceRequestItem,
} from './requests.schema.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

const creatorAlias = alias(users, 'creator');
const reviewerAlias = alias(users, 'reviewer');

function formatRequestItem(row: any): MaintenanceRequestItem {
  return {
    id: row.id,
    machine_id: row.machine_id,
    problem_description: row.problem_description,
    priority: row.priority,
    status: row.status,
    created_by: row.created_by,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    reviewed_by: row.reviewed_by ?? null,
    reviewed_at: row.reviewed_at
      ? row.reviewed_at instanceof Date
        ? row.reviewed_at.toISOString()
        : String(row.reviewed_at)
      : null,
    reviewer_notes: row.reviewer_notes ?? null,
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    machine: row.machine && row.machine.id ? row.machine : null,
    creator: row.creator && row.creator.id ? row.creator : null,
    reviewer: row.reviewer && row.reviewer.id ? row.reviewer : null,
  };
}

/**
 * Creates a new maintenance request (US-REQ-01, TEST-RBAC-01)
 * Status is automatically locked to 'Submitted' and created_by is bound to current user.
 */
export async function createRequest(
  currentUser: AuthUser,
  input: CreateRequestInput
): Promise<MaintenanceRequestItem> {
  // Validate that machine exists and is active
  const machine = await db.query.machines.findFirst({
    where: and(eq(machines.id, input.machine_id), eq(machines.is_active, true)),
  });

  if (!machine) {
    throw new HttpError(
      400,
      'Invalid machine_id: Machine does not exist or is inactive'
    );
  }

  const [inserted] = await db
    .insert(maintenanceRequests)
    .values({
      machine_id: input.machine_id,
      problem_description: input.problem_description,
      priority: input.priority,
      status: 'Submitted',
      created_by: currentUser.id,
      reviewed_by: null,
      reviewed_at: null,
      reviewer_notes: null,
    })
    .returning();

  const fullRecord = await getRequestById(currentUser, inserted.id);
  if (!fullRecord) {
    throw new HttpError(500, 'Failed to retrieve created maintenance request');
  }

  return fullRecord;
}

/**
 * Retrieves paginated list of maintenance requests with server-side ILIKE search,
 * filtering, and strict RBAC enforcement (US-REQ-02, US-REQ-05, US-SYS-01 / Bonus #2).
 */
export async function listRequests(
  currentUser: AuthUser,
  query: RequestQueryInput
): Promise<{
  data: MaintenanceRequestItem[];
  pagination: {
    total_records: number;
    current_page: number;
    total_pages: number;
    limit: number;
  };
}> {
  const whereConditions: SQL[] = [];

  // US-REQ-02 & TEST-RBAC-02: Operator is strictly restricted to their own requests
  if (currentUser.role === 'Operator') {
    whereConditions.push(eq(maintenanceRequests.created_by, currentUser.id));
  }

  // Filter: status
  if (query.status) {
    whereConditions.push(eq(maintenanceRequests.status, query.status));
  }

  // Filter: priority
  if (query.priority) {
    whereConditions.push(eq(maintenanceRequests.priority, query.priority));
  }

  // Filter: machine_id
  if (query.machine_id) {
    whereConditions.push(eq(maintenanceRequests.machine_id, query.machine_id));
  }

  // Bonus #2 / US-SYS-01: Multi-column ILIKE search across machine code, machine name, and problem description
  if (query.search && query.search.trim()) {
    const term = `%${query.search.trim()}%`;
    const searchCondition = or(
      ilike(machines.code, term),
      ilike(machines.name, term),
      ilike(maintenanceRequests.problem_description, term)
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // 1. Total records count
  const [countResult] = await db
    .select({ count: count() })
    .from(maintenanceRequests)
    .leftJoin(machines, eq(maintenanceRequests.machine_id, machines.id))
    .where(whereClause);

  const total_records = Number(countResult?.count ?? 0);
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 10));
  const offset = (page - 1) * limit;
  const total_pages = Math.ceil(total_records / limit) || 1;

  // 2. Fetch paginated data
  const rows = await db
    .select({
      id: maintenanceRequests.id,
      machine_id: maintenanceRequests.machine_id,
      problem_description: maintenanceRequests.problem_description,
      priority: maintenanceRequests.priority,
      status: maintenanceRequests.status,
      created_by: maintenanceRequests.created_by,
      created_at: maintenanceRequests.created_at,
      reviewed_by: maintenanceRequests.reviewed_by,
      reviewed_at: maintenanceRequests.reviewed_at,
      reviewer_notes: maintenanceRequests.reviewer_notes,
      updated_at: maintenanceRequests.updated_at,
      machine: {
        id: machines.id,
        code: machines.code,
        name: machines.name,
        location: machines.location,
      },
      creator: {
        id: creatorAlias.id,
        username: creatorAlias.username,
        email: creatorAlias.email,
      },
      reviewer: {
        id: reviewerAlias.id,
        username: reviewerAlias.username,
        email: reviewerAlias.email,
      },
    })
    .from(maintenanceRequests)
    .leftJoin(machines, eq(maintenanceRequests.machine_id, machines.id))
    .leftJoin(creatorAlias, eq(maintenanceRequests.created_by, creatorAlias.id))
    .leftJoin(reviewerAlias, eq(maintenanceRequests.reviewed_by, reviewerAlias.id))
    .where(whereClause)
    .orderBy(desc(maintenanceRequests.created_at))
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map(formatRequestItem),
    pagination: {
      total_records,
      current_page: page,
      total_pages,
      limit,
    },
  };
}

/**
 * Retrieves a single maintenance request by ID (US-REQ-04, TEST-RBAC-03).
 * Enforces ownership boundary for Operators.
 */
export async function getRequestById(
  currentUser: AuthUser,
  id: number
): Promise<MaintenanceRequestItem | null> {
  const rows = await db
    .select({
      id: maintenanceRequests.id,
      machine_id: maintenanceRequests.machine_id,
      problem_description: maintenanceRequests.problem_description,
      priority: maintenanceRequests.priority,
      status: maintenanceRequests.status,
      created_by: maintenanceRequests.created_by,
      created_at: maintenanceRequests.created_at,
      reviewed_by: maintenanceRequests.reviewed_by,
      reviewed_at: maintenanceRequests.reviewed_at,
      reviewer_notes: maintenanceRequests.reviewer_notes,
      updated_at: maintenanceRequests.updated_at,
      machine: {
        id: machines.id,
        code: machines.code,
        name: machines.name,
        location: machines.location,
      },
      creator: {
        id: creatorAlias.id,
        username: creatorAlias.username,
        email: creatorAlias.email,
      },
      reviewer: {
        id: reviewerAlias.id,
        username: reviewerAlias.username,
        email: reviewerAlias.email,
      },
    })
    .from(maintenanceRequests)
    .leftJoin(machines, eq(maintenanceRequests.machine_id, machines.id))
    .leftJoin(creatorAlias, eq(maintenanceRequests.created_by, creatorAlias.id))
    .leftJoin(reviewerAlias, eq(maintenanceRequests.reviewed_by, reviewerAlias.id))
    .where(eq(maintenanceRequests.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  // TEST-RBAC-03: Operator trying to view another user's request is forbidden
  if (currentUser.role === 'Operator' && row.created_by !== currentUser.id) {
    throw new HttpError(
      403,
      'Forbidden: You can only view your own maintenance requests'
    );
  }

  return formatRequestItem(row);
}

/**
 * Updates a maintenance request with RBAC and status transition enforcement
 * (US-REQ-03, US-REQ-04, US-REQ-08, US-REQ-09, TEST-RBAC-04, 05, 11, 13).
 */
export async function updateRequest(
  currentUser: AuthUser,
  id: number,
  input: UpdateRequestInput
): Promise<MaintenanceRequestItem | null> {
  const existing = await db.query.maintenanceRequests.findFirst({
    where: eq(maintenanceRequests.id, id),
  });

  if (!existing) {
    return null;
  }

  // RBAC & Status checks:
  if (currentUser.role === 'Operator') {
    // Must be own request
    if (existing.created_by !== currentUser.id) {
      throw new HttpError(
        403,
        'Forbidden: You can only edit your own maintenance requests'
      );
    }
    // Must still be 'Submitted' (TEST-RBAC-05)
    if (existing.status !== 'Submitted') {
      throw new HttpError(
        403,
        'Forbidden: Cannot edit request that has already been reviewed'
      );
    }
  } else if (currentUser.role === 'Supervisor') {
    // TEST-RBAC-11 / US-REQ-08: Supervisor cannot edit requests created by others
    if (existing.created_by !== currentUser.id) {
      throw new HttpError(
        403,
        'Forbidden: Supervisors cannot edit maintenance requests created by others'
      );
    }
    // Must still be 'Submitted'
    if (existing.status !== 'Submitted') {
      throw new HttpError(
        403,
        'Forbidden: Cannot edit request that has already been reviewed'
      );
    }
  } else if (currentUser.role === 'Admin') {
    // TEST-RBAC-13 / US-REQ-09: Admin can edit any request on any status
  }

  // Validate machine_id if provided
  if (input.machine_id !== undefined) {
    const machine = await db.query.machines.findFirst({
      where: and(eq(machines.id, input.machine_id), eq(machines.is_active, true)),
    });
    if (!machine) {
      throw new HttpError(
        400,
        'Invalid machine_id: Machine does not exist or is inactive'
      );
    }
  }

  const updateValues: Partial<typeof maintenanceRequests.$inferInsert> = {
    updated_at: new Date(),
  };

  if (input.machine_id !== undefined) {
    updateValues.machine_id = input.machine_id;
  }
  if (input.problem_description !== undefined) {
    updateValues.problem_description = input.problem_description;
  }
  if (input.priority !== undefined) {
    updateValues.priority = input.priority;
  }

  await db
    .update(maintenanceRequests)
    .set(updateValues)
    .where(eq(maintenanceRequests.id, id));

  return getRequestById(currentUser, id);
}

/**
 * Reviews a maintenance request (Approve or Reject)
 * (US-REQ-06, US-REQ-07, TEST-RBAC-09, 10).
 * Restricted to Supervisor and Admin via route middleware.
 */
export async function reviewRequest(
  currentUser: AuthUser,
  id: number,
  input: ReviewRequestInput
): Promise<MaintenanceRequestItem | null> {
  const existing = await db.query.maintenanceRequests.findFirst({
    where: eq(maintenanceRequests.id, id),
  });

  if (!existing) {
    return null;
  }

  await db
    .update(maintenanceRequests)
    .set({
      status: input.status,
      reviewer_notes:
        input.reviewer_notes !== undefined
          ? input.reviewer_notes
          : existing.reviewer_notes,
      reviewed_by: currentUser.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(maintenanceRequests.id, id));

  return getRequestById(currentUser, id);
}

/**
 * Deletes a maintenance request (US-REQ-10, TEST-RBAC-14).
 * Restricted to Admin via route middleware.
 */
export async function deleteRequest(
  currentUser: AuthUser,
  id: number
): Promise<{ id: number } | null> {
  const existing = await db.query.maintenanceRequests.findFirst({
    where: eq(maintenanceRequests.id, id),
  });

  if (!existing) {
    return null;
  }

  await db
    .delete(maintenanceRequests)
    .where(eq(maintenanceRequests.id, id));

  return { id };
}
