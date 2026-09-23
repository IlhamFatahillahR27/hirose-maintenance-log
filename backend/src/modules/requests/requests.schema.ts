import { z } from '@hono/zod-openapi';

export const PriorityEnumSchema = z.enum(['Low', 'Medium', 'High', 'Critical']).openapi('PriorityEnum');
export const StatusEnumSchema = z.enum(['Submitted', 'Approved', 'Rejected']).openapi('StatusEnum');

export const MachineSummarySchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    code: z.string().openapi({ example: 'MCH-STAMP-01' }),
    name: z.string().openapi({ example: 'High Speed Stamping Press 01' }),
    location: z.string().openapi({ example: 'Building A - Stamping Line 1' }),
  })
  .openapi('MachineSummary');

export const UserSummarySchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    username: z.string().openapi({ example: 'operator1' }),
    email: z.string().openapi({ example: 'operator1@hirose.co.id' }),
  })
  .openapi('UserSummary');

export const MaintenanceRequestItemSchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    machine_id: z.number().openapi({ example: 1 }),
    problem_description: z.string().openapi({ example: 'Hydraulic pressure drop on main press ram' }),
    priority: PriorityEnumSchema,
    status: StatusEnumSchema,
    created_by: z.number().openapi({ example: 1 }),
    created_at: z.string().openapi({ example: '2026-09-23T10:00:00.000Z' }),
    reviewed_by: z.number().nullable().openapi({ example: 2 }),
    reviewed_at: z.string().nullable().openapi({ example: '2026-09-23T11:00:00.000Z' }),
    reviewer_notes: z.string().nullable().openapi({ example: 'Approved for urgent tool crib seal kit replacement.' }),
    updated_at: z.string().openapi({ example: '2026-09-23T11:00:00.000Z' }),
    machine: MachineSummarySchema.nullable().optional(),
    creator: UserSummarySchema.nullable().optional(),
    reviewer: UserSummarySchema.nullable().optional(),
  })
  .openapi('MaintenanceRequestItem');

export const CreateRequestSchema = z
  .object({
    machine_id: z.coerce
      .number()
      .int()
      .positive('Machine ID must be a positive integer')
      .openapi({ example: 1, description: 'ID of precision machine' }),
    problem_description: z
      .string()
      .trim()
      .min(5, 'Problem description must be at least 5 characters')
      .openapi({ example: 'Hydraulic pressure dropped below operating threshold', description: 'Detailed issue description' }),
    priority: PriorityEnumSchema.openapi({ example: 'High', description: 'Urgency level' }),
  })
  .openapi('CreateRequest');

export const UpdateRequestSchema = z
  .object({
    machine_id: z.coerce
      .number()
      .int()
      .positive('Machine ID must be a positive integer')
      .optional()
      .openapi({ example: 1, description: 'Updated ID of machine' }),
    problem_description: z
      .string()
      .trim()
      .min(5, 'Problem description must be at least 5 characters')
      .optional()
      .openapi({ example: 'Hydraulic pressure dropped below 30-bar limit on cylinder #2', description: 'Updated description' }),
    priority: PriorityEnumSchema.optional().openapi({ example: 'Critical', description: 'Updated urgency level' }),
  })
  .openapi('UpdateRequest');

export const ReviewRequestSchema = z
  .object({
    status: z.enum(['Approved', 'Rejected']).openapi({ example: 'Approved', description: 'Review verdict' }),
    reviewer_notes: z
      .string()
      .trim()
      .max(1000, 'Reviewer notes must not exceed 1000 characters')
      .optional()
      .nullable()
      .openapi({ example: 'Approved. Dispatched maintenance technician team.', description: 'Supervisor explanation or notes' }),
  })
  .openapi('ReviewRequest');

export const RequestQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1).openapi({ example: 1, description: 'Page number (1-indexed)' }),
    limit: z.coerce.number().int().positive().max(100).default(10).openapi({ example: 10, description: 'Page record size limit (max 100)' }),
    status: StatusEnumSchema.optional().openapi({ example: 'Submitted', description: 'Filter by ticket status' }),
    priority: PriorityEnumSchema.optional().openapi({ example: 'High', description: 'Filter by ticket priority' }),
    machine_id: z.coerce.number().int().positive().optional().openapi({ example: 1, description: 'Filter by machine ID' }),
    search: z.string().optional().openapi({ example: 'STAMP', description: 'Server-side keyword search across machine code, machine name, and problem description' }),
  })
  .openapi('RequestQuery');

export const PaginationMetadataSchema = z
  .object({
    total_records: z.number().openapi({ example: 1050 }),
    current_page: z.number().openapi({ example: 1 }),
    total_pages: z.number().openapi({ example: 105 }),
    limit: z.number().openapi({ example: 10 }),
  })
  .openapi('PaginationMetadata');

export const RequestsListResponseSchema = z
  .object({
    data: z.array(MaintenanceRequestItemSchema),
    pagination: PaginationMetadataSchema,
  })
  .openapi('RequestsListResponse');

export const SingleRequestResponseSchema = z
  .object({
    data: MaintenanceRequestItemSchema,
  })
  .openapi('SingleRequestResponse');

export const DeleteResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Maintenance request deleted successfully' }),
    id: z.number().openapi({ example: 1 }),
  })
  .openapi('DeleteResponse');

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Error message description' }),
    issues: z.array(z.any()).optional(),
  })
  .openapi('RequestErrorResponse');

export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;
export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>;
export type ReviewRequestInput = z.infer<typeof ReviewRequestSchema>;
export type RequestQueryInput = z.infer<typeof RequestQuerySchema>;
export type MaintenanceRequestItem = z.infer<typeof MaintenanceRequestItemSchema>;
