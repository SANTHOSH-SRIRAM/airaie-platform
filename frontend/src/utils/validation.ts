import { z } from 'zod';

/**
 * Common validation schemas
 */
export const schemas = {
  email: z.string().email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),

  url: z.string().url('Invalid URL'),

  uuid: z.string().uuid('Invalid ID'),
};

/**
 * Validate data against a schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
