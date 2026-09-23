import { z } from '@hono/zod-openapi';

export const MachineItemSchema = z
  .object({
    id: z.number().openapi({ example: 1, description: 'Unique machine identifier' }),
    code: z.string().openapi({ example: 'MCH-STAMP-01', description: 'Unique machine code' }),
    name: z.string().openapi({ example: 'High Speed Stamping Press 01', description: 'Machine display name' }),
    location: z.string().openapi({ example: 'Building A - Stamping Line 1', description: 'Factory plant location' }),
  })
  .openapi('MachineItem');

export const MachinePaginationMetadataSchema = z
  .object({
    total_records: z.number().openapi({ example: 7 }),
    current_page: z.number().openapi({ example: 1 }),
    total_pages: z.number().openapi({ example: 1 }),
    limit: z.number().openapi({ example: 50 }),
  })
  .openapi('MachinePaginationMetadata');

export const MachinesQuerySchema = z
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
      .default(50)
      .openapi({
        example: 50,
        description: 'Records per page (default 50 to return all machines for dropdowns)',
      }),
    search: z
      .string()
      .optional()
      .openapi({
        example: 'STAMP',
        description: 'Server-side search across machine code, name, or location',
      }),
  })
  .openapi('MachinesQuery');

export const MachinesListResponseSchema = z
  .object({
    data: z.array(MachineItemSchema).openapi({ description: 'List of active precision machines' }),
    pagination: MachinePaginationMetadataSchema,
  })
  .openapi('MachinesListResponse');

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Unauthorized' }),
  })
  .openapi('MachineErrorResponse');

export type MachineItem = z.infer<typeof MachineItemSchema>;
export type MachinesQueryInput = z.infer<typeof MachinesQuerySchema>;
export type MachinesListResponse = z.infer<typeof MachinesListResponseSchema>;
