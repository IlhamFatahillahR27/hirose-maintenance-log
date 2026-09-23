import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. ENUMS
// ==========================================

export const priorityEnum = pgEnum('priority_enum', [
  'Low',
  'Medium',
  'High',
  'Critical',
]);

export const statusEnum = pgEnum('status_enum', [
  'Submitted',
  'Approved',
  'Rejected',
]);

// ==========================================
// 2. ROLES & PERMISSIONS (RELATIONAL RBAC)
// ==========================================

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // 'Operator', 'Supervisor', 'Admin'
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), // e.g. 'requests:create', 'requests:review'
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission_id: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.role_id, table.permission_id] }),
  ]
);

// ==========================================
// 3. USERS
// ==========================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role_id: integer('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'restrict' }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 4. MACHINES (READ-ONLY MASTER VIA SEEDER)
// ==========================================

export const machines = pgTable('machines', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // e.g. 'MCH-STAMP-01'
  name: varchar('name', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 5. MAINTENANCE REQUESTS
// ==========================================

export const maintenanceRequests = pgTable(
  'maintenance_requests',
  {
    id: serial('id').primaryKey(),
    machine_id: integer('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'restrict' }),
    problem_description: text('problem_description').notNull(),
    priority: priorityEnum('priority').notNull(),
    status: statusEnum('status').notNull().default('Submitted'),
    created_by: integer('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    reviewed_by: integer('reviewed_by')
      .references(() => users.id, { onDelete: 'set null' }),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    reviewer_notes: text('reviewer_notes'),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('req_created_by_idx').on(table.created_by),
    index('req_status_idx').on(table.status),
    index('req_priority_idx').on(table.priority),
    index('req_machine_id_idx').on(table.machine_id),
    index('req_created_at_idx').on(table.created_at),
  ]
);

// ==========================================
// 6. RELATIONS
// ==========================================

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.role_id],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permission_id],
    references: [permissions.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.role_id],
    references: [roles.id],
  }),
  createdRequests: many(maintenanceRequests, { relationName: 'creator' }),
  reviewedRequests: many(maintenanceRequests, { relationName: 'reviewer' }),
}));

export const machinesRelations = relations(machines, ({ many }) => ({
  requests: many(maintenanceRequests),
}));

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one }) => ({
  machine: one(machines, {
    fields: [maintenanceRequests.machine_id],
    references: [machines.id],
  }),
  creator: one(users, {
    fields: [maintenanceRequests.created_by],
    references: [users.id],
    relationName: 'creator',
  }),
  reviewer: one(users, {
    fields: [maintenanceRequests.reviewed_by],
    references: [users.id],
    relationName: 'reviewer',
  }),
}));

// ==========================================
// 7. INFERRED TYPES
// ==========================================

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Machine = typeof machines.$inferSelect;
export type NewMachine = typeof machines.$inferInsert;

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type NewMaintenanceRequest = typeof maintenanceRequests.$inferInsert;
