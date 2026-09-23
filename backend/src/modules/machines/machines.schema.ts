import { z } from '@hono/zod-openapi';

export const MachineItemSchema = z
  .object({
    id: z.number().openapi({ example: 1, description: 'Unique machine identifier' }),
    code: z.string().openapi({ example: 'MCH-STAMP-01', description: 'Unique machine code' }),
    name: z.string().openapi({ example: 'High Speed Stamping Press 01', description: 'Machine display name' }),
    location: z.string().openapi({ example: 'Building A - Stamping Line 1', description: 'Factory plant location' }),
  })
  .openapi('MachineItem');

export const MachinesListResponseSchema = z
  .object({
    data: z.array(MachineItemSchema).openapi({ description: 'List of active precision machines' }),
  })
  .openapi('MachinesListResponse');

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Unauthorized' }),
  })
  .openapi('MachineErrorResponse');

export type MachineItem = z.infer<typeof MachineItemSchema>;
export type MachinesListResponse = z.infer<typeof MachinesListResponseSchema>;
