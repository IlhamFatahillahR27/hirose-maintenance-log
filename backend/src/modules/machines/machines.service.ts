import { eq, asc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { machines } from '../../db/schema.js';
import type { MachineItem } from './machines.schema.js';

/**
 * Retrieves all active machines from the database,
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
