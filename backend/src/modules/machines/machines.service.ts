import { eq, asc, and, or, ilike, count, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { machines } from '../../db/schema.js';
import type { MachineItem, MachinesQueryInput } from './machines.schema.js';

/**
 * Retrieves all active machines from the database without pagination,
 * ordered deterministically by ID ascending.
 *
 * Implements FR-MCH-01 and US-MCH-01.
 */
export async function getActiveMachines(): Promise<MachineItem[]> {
  const result = await db
    .select({
      id: machines.id,
      code: machines.code,
      name: machines.name,
      location: machines.location,
    })
    .from(machines)
    .where(eq(machines.is_active, true))
    .orderBy(asc(machines.id));

  return result;
}

/**
 * Retrieves paginated active machines list with optional search on code, name, or location.
 */
export async function getPaginatedActiveMachines(
  query: MachinesQueryInput = { page: 1, limit: 50 }
): Promise<{
  data: MachineItem[];
  pagination: {
    total_records: number;
    current_page: number;
    total_pages: number;
    limit: number;
  };
}> {
  const whereConditions: SQL[] = [eq(machines.is_active, true)];

  if (query.search && query.search.trim()) {
    const term = `%${query.search.trim()}%`;
    const searchCond = or(
      ilike(machines.code, term),
      ilike(machines.name, term),
      ilike(machines.location, term)
    );
    if (searchCond) {
      whereConditions.push(searchCond);
    }
  }

  const whereClause = and(...whereConditions);

  const [countResult] = await db
    .select({ count: count() })
    .from(machines)
    .where(whereClause);

  const total_records = Number(countResult?.count ?? 0);
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 50));
  const offset = (page - 1) * limit;
  const total_pages = Math.ceil(total_records / limit) || 1;

  const result = await db
    .select({
      id: machines.id,
      code: machines.code,
      name: machines.name,
      location: machines.location,
    })
    .from(machines)
    .where(whereClause)
    .orderBy(asc(machines.id))
    .limit(limit)
    .offset(offset);

  return {
    data: result,
    pagination: {
      total_records,
      current_page: page,
      total_pages,
      limit,
    },
  };
}
