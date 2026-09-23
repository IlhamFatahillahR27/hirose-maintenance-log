import { db, pool } from './index.js';
import {
  roles,
  permissions,
  rolePermissions,
  users,
  machines,
  maintenanceRequests,
} from './schema.js';
import { hashPassword } from '../utils/password.js';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // 0. Check if database is already seeded
    const userCheck = await db.execute(sql`SELECT count(*)::int as count FROM users`);
    const count = Number((userCheck as any)[0]?.count ?? (userCheck as any).rows?.[0]?.count ?? 0);

    if (count > 0 && process.env.FORCE_SEED !== 'true') {
      console.log('ℹ️ Database is already seeded (records exist). Skipping seed to preserve data.');
      console.log('💡 Tip: Set environment variable FORCE_SEED=true to force a clean re-seed.');
      return;
    }

    // Clean existing data in reverse dependency order
    console.log('🧹 Cleaning existing records (idempotent reset)...');
    await db.execute(
      sql`TRUNCATE TABLE maintenance_requests, users, machines, role_permissions, permissions, roles RESTART IDENTITY CASCADE`
    );

    // 1. Seed Roles
    console.log('👑 Seeding roles...');
    const insertedRoles = await db
      .insert(roles)
      .values([
        {
          name: 'Operator',
          description: 'Production line operator responsible for reporting machine issues',
        },
        {
          name: 'Supervisor',
          description: 'Engineering and maintenance supervisor reviewing and authorizing requests',
        },
        {
          name: 'Admin',
          description: 'System administrator with complete access to users, machines, and requests',
        },
      ])
      .returning();

    const roleMap = new Map<string, number>();
    for (const r of insertedRoles) {
      roleMap.set(r.name, r.id);
    }

    // 2. Seed Permissions
    console.log('🔑 Seeding granular permissions...');
    const permissionData = [
      { name: 'machines:read', description: 'View registered factory machines and locations' },
      { name: 'requests:create', description: 'Create a new maintenance request' },
      { name: 'requests:read_own', description: 'View own created maintenance requests' },
      { name: 'requests:read_all', description: 'View all maintenance requests across the factory' },
      { name: 'requests:update_own', description: 'Update own request details while still Submitted' },
      { name: 'requests:update_any', description: 'Update any maintenance request at any status' },
      { name: 'requests:review', description: 'Approve or Reject maintenance requests' },
      { name: 'requests:delete', description: 'Delete a maintenance request' },
      { name: 'users:manage', description: 'Manage users, create accounts, and toggle active status' },
    ];

    const insertedPermissions = await db
      .insert(permissions)
      .values(permissionData)
      .returning();

    const permMap = new Map<string, number>();
    for (const p of insertedPermissions) {
      permMap.set(p.name, p.id);
    }

    // 3. Seed Role-Permissions Mapping
    console.log('🔗 Mapping role permissions...');
    const rolePermissionMappings = [
      // Operator
      { role: 'Operator', perm: 'machines:read' },
      { role: 'Operator', perm: 'requests:create' },
      { role: 'Operator', perm: 'requests:read_own' },
      { role: 'Operator', perm: 'requests:update_own' },
      // Supervisor
      { role: 'Supervisor', perm: 'machines:read' },
      { role: 'Supervisor', perm: 'requests:create' },
      { role: 'Supervisor', perm: 'requests:read_own' },
      { role: 'Supervisor', perm: 'requests:read_all' },
      { role: 'Supervisor', perm: 'requests:update_own' },
      { role: 'Supervisor', perm: 'requests:review' },
      // Admin (All permissions)
      { role: 'Admin', perm: 'machines:read' },
      { role: 'Admin', perm: 'requests:create' },
      { role: 'Admin', perm: 'requests:read_own' },
      { role: 'Admin', perm: 'requests:read_all' },
      { role: 'Admin', perm: 'requests:update_own' },
      { role: 'Admin', perm: 'requests:update_any' },
      { role: 'Admin', perm: 'requests:review' },
      { role: 'Admin', perm: 'requests:delete' },
      { role: 'Admin', perm: 'users:manage' },
    ];

    await db.insert(rolePermissions).values(
      rolePermissionMappings.map((m) => ({
        role_id: roleMap.get(m.role)!,
        permission_id: permMap.get(m.perm)!,
      }))
    );

    // 4. Seed Users (with hashed password)
    console.log('👤 Seeding default users (4 accounts)...');
    const defaultPasswordHash = await hashPassword('Password123!');

    const insertedUsers = await db
      .insert(users)
      .values([
        {
          username: 'operator1',
          email: 'operator1@hirose.co.id',
          password_hash: defaultPasswordHash,
          role_id: roleMap.get('Operator')!,
          is_active: true,
        },
        {
          username: 'supervisor1',
          email: 'supervisor1@hirose.co.id',
          password_hash: defaultPasswordHash,
          role_id: roleMap.get('Supervisor')!,
          is_active: true,
        },
        {
          username: 'admin1',
          email: 'admin1@hirose.co.id',
          password_hash: defaultPasswordHash,
          role_id: roleMap.get('Admin')!,
          is_active: true,
        },
        {
          username: 'inactive_user',
          email: 'inactive@hirose.co.id',
          password_hash: defaultPasswordHash,
          role_id: roleMap.get('Operator')!,
          is_active: false,
        },
      ])
      .returning();

    const userMap = new Map<string, number>();
    for (const u of insertedUsers) {
      userMap.set(u.username, u.id);
    }

    // 5. Seed Precision Machines (Hirose Electric Indonesia)
    console.log('⚙️ Seeding 7 precision machines...');
    const insertedMachines = await db
      .insert(machines)
      .values([
        {
          code: 'MCH-STAMP-01',
          name: 'High Speed Stamping Press 01',
          location: 'Building A - Stamping Line 1',
          is_active: true,
        },
        {
          code: 'MCH-STAMP-02',
          name: 'Precision Stamping Press 02',
          location: 'Building A - Stamping Line 2',
          is_active: true,
        },
        {
          code: 'MCH-MOLD-01',
          name: 'Precision Plastic Injection Molding 01',
          location: 'Building B - Molding Hall 1',
          is_active: true,
        },
        {
          code: 'MCH-MOLD-02',
          name: 'Micro Connector Injection Molding 02',
          location: 'Building B - Molding Hall 2',
          is_active: true,
        },
        {
          code: 'MCH-PLAT-01',
          name: 'Continuous Gold/Tin Plating Line 01',
          location: 'Building C - Surface Finishing',
          is_active: true,
        },
        {
          code: 'MCH-ASSY-01',
          name: 'Automated Connector Pin Assembly 01',
          location: 'Building A - Final Assembly Area',
          is_active: true,
        },
        {
          code: 'MCH-ASSY-02',
          name: 'High-Speed Optical Inspection & Pack 02',
          location: 'Building A - Packaging Area',
          is_active: true,
        },
      ])
      .returning();

    const machineIds = insertedMachines.map((m) => m.id);

    // 6. Seed 10 Realistic Initial Sample Requests
    console.log('📋 Seeding 10 realistic initial sample maintenance requests...');
    const operator1Id = userMap.get('operator1')!;
    const supervisor1Id = userMap.get('supervisor1')!;

    const sampleRequests = [
      {
        machine_id: machineIds[0], // MCH-STAMP-01
        problem_description: 'High speed terminal strip feeder misalignment causing bent pins during 600spm stamping.',
        priority: 'High' as const,
        status: 'Submitted' as const,
        created_by: operator1Id,
        reviewed_by: null,
        reviewed_at: null,
        reviewer_notes: null,
      },
      {
        machine_id: machineIds[1], // MCH-STAMP-02
        problem_description: 'Hydraulic pressure fluctuation on main press ram (>15% drop below rated 40-ton limit).',
        priority: 'Critical' as const,
        status: 'Approved' as const,
        created_by: operator1Id,
        reviewed_by: supervisor1Id,
        reviewed_at: new Date(Date.now() - 2 * 3600 * 1000),
        reviewer_notes: 'Approved. Immediate maintenance team dispatched. Replacement seal kits allocated from tool crib.',
      },
      {
        machine_id: machineIds[2], // MCH-MOLD-01
        problem_description: 'Cavity #4 temperature sensor reading erratic, causing slight flash defect on 0.5mm connector housing.',
        priority: 'Medium' as const,
        status: 'Approved' as const,
        created_by: operator1Id,
        reviewed_by: supervisor1Id,
        reviewed_at: new Date(Date.now() - 5 * 3600 * 1000),
        reviewer_notes: 'Approved for mold cleaning and thermocouple replacement during 2nd shift changeover.',
      },
      {
        machine_id: machineIds[3], // MCH-MOLD-02
        problem_description: 'Minor cosmetic scratch on operator safety door acrylic panel. No functional hazard.',
        priority: 'Low' as const,
        status: 'Rejected' as const,
        created_by: operator1Id,
        reviewed_by: supervisor1Id,
        reviewed_at: new Date(Date.now() - 8 * 3600 * 1000),
        reviewer_notes: 'Rejected. Door acrylic is functionally intact and interlock safety functions properly; will be replaced during quarterly preventive maintenance.',
      },
      {
        machine_id: machineIds[4], // MCH-PLAT-01
        problem_description: 'Electroplating bath 2 gold concentration sensor calibration overdue; rinse water conductivity alert.',
        priority: 'High' as const,
        status: 'Submitted' as const,
        created_by: operator1Id,
        reviewed_by: null,
        reviewed_at: null,
        reviewer_notes: null,
      },
      {
        machine_id: machineIds[5], // MCH-ASSY-01
        problem_description: 'Vibratory bowl feeder jam on 0.4mm pitch header pins causing assembly head starvation.',
        priority: 'Critical' as const,
        status: 'Approved' as const,
        created_by: operator1Id,
        reviewed_by: supervisor1Id,
        reviewed_at: new Date(Date.now() - 1 * 3600 * 1000),
        reviewer_notes: 'Approved. Line stopped, tooling technician assigned to inspect bowl track alignment.',
      },
      {
        machine_id: machineIds[6], // MCH-ASSY-02
        problem_description: 'Optical inspection camera 1 auxiliary illumination LED flickering under ambient light.',
        priority: 'Medium' as const,
        status: 'Submitted' as const,
        created_by: operator1Id,
        reviewed_by: null,
        reviewed_at: null,
        reviewer_notes: null,
      },
      {
        machine_id: machineIds[0], // MCH-STAMP-01
        problem_description: 'Lube oil pressure switch warning tripped during continuous stamping run.',
        priority: 'High' as const,
        status: 'Rejected' as const,
        created_by: operator1Id,
        reviewed_by: supervisor1Id,
        reviewed_at: new Date(Date.now() - 12 * 3600 * 1000),
        reviewer_notes: 'Rejected. Oil filter was already replaced during previous shift; pressure switch sensor was simply reset.',
      },
      {
        machine_id: machineIds[2], // MCH-MOLD-01
        problem_description: 'Ejector pin guide lubrication drying out on mold B core insert.',
        priority: 'Low' as const,
        status: 'Approved' as const,
        created_by: operator1Id,
        reviewed_by: supervisor1Id,
        reviewed_at: new Date(Date.now() - 18 * 3600 * 1000),
        reviewer_notes: 'Approved. Food-grade high-temp grease applied by technician. Problem resolved.',
      },
      {
        machine_id: machineIds[4], // MCH-PLAT-01
        problem_description: 'Exhaust scrubber ventilation airflow sensor reading below 85% required cfm.',
        priority: 'Critical' as const,
        status: 'Submitted' as const,
        created_by: operator1Id,
        reviewed_by: null,
        reviewed_at: null,
        reviewer_notes: null,
      },
    ];

    await db.insert(maintenanceRequests).values(sampleRequests);

    // 7. Seed Batch Dummy Requests (>1,000 records for US-SYS-01 pagination and search)
    console.log('📦 Generating 1,050 batch dummy maintenance requests for pagination & search performance testing...');

    const problemTemplates = [
      'Micro-crack detected on mold core pin station',
      'Air pressure leakage on pneumatic cylinder valve',
      'Servo motor bearing temperature warning exceeding 75°C',
      'Optical sensor lens clouded with oil mist residue',
      'Conveyor discharge belt tension loose causing pin skew',
      'Strip guide roller bearing noisy during high-speed feed',
      'Ionizer bar discharge pin contaminated with dust',
      'Vacuum pick-and-place cup worn out on assembly arm',
      'Die punch wear exceeds 0.015mm sharpening threshold',
      'Cooling water flow sensor reading below minimum setpoint',
      'Terminal pitch spacing deviation beyond 0.02mm tolerance',
      'Heater cartridge resistance open-circuit in mold block B',
    ];

    const priorities = ['Low', 'Medium', 'High', 'Critical'] as const;
    const statuses = ['Submitted', 'Approved', 'Rejected'] as const;

    const batchRequests: Array<{
      machine_id: number;
      problem_description: string;
      priority: (typeof priorities)[number];
      status: (typeof statuses)[number];
      created_by: number;
      created_at: Date;
      reviewed_by: number | null;
      reviewed_at: Date | null;
      reviewer_notes: string | null;
    }> = [];

    const TOTAL_BATCH = 1050;
    const now = Date.now();

    for (let i = 1; i <= TOTAL_BATCH; i++) {
      const machine_id = machineIds[i % machineIds.length];
      const problem = problemTemplates[i % problemTemplates.length];
      const priority = priorities[i % priorities.length];
      const status = statuses[i % statuses.length];
      const createdDaysAgo = Math.floor(i / 15);
      const createdAt = new Date(now - createdDaysAgo * 86400 * 1000 - (i % 86400) * 1000);

      let reviewed_by: number | null = null;
      let reviewed_at: Date | null = null;
      let reviewer_notes: string | null = null;

      if (status !== 'Submitted') {
        reviewed_by = supervisor1Id;
        reviewed_at = new Date(createdAt.getTime() + 3600 * 1000);
        reviewer_notes =
          status === 'Approved'
            ? `Batch approved #${i}. Maintenance scheduled.`
            : `Batch rejected #${i}. Duplicate ticket or normal operating condition.`;
      }

      batchRequests.push({
        machine_id,
        problem_description: `${problem} [Batch Ref #${i}]`,
        priority,
        status,
        created_by: operator1Id,
        created_at: createdAt,
        reviewed_by,
        reviewed_at,
        reviewer_notes,
      });
    }

    // Insert in chunks of 200 to ensure fast execution
    const CHUNK_SIZE = 200;
    for (let i = 0; i < batchRequests.length; i += CHUNK_SIZE) {
      const chunk = batchRequests.slice(i, i + CHUNK_SIZE);
      await db.insert(maintenanceRequests).values(chunk);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('--------------------------------------------------');
    console.log('📊 Summary of Seeded Data:');
    console.log('   - Roles: 3 (Operator, Supervisor, Admin)');
    console.log('   - Permissions: 9 granular permissions');
    console.log('   - Role-Permission Mappings: 18 relational links');
    console.log('   - Users: 4 accounts (operator1, supervisor1, admin1, inactive_user)');
    console.log('   - Machines: 7 Hirose precision machines');
    console.log(`   - Maintenance Requests: ${10 + TOTAL_BATCH} records (10 sample + 1,050 batch)`);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
