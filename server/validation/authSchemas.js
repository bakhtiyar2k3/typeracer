import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
  country: z.string().trim().max(56).optional().default(''),
});

export const loginSchema = z.object({
  // Accept either email or username in a single field.
  identifier: z.string().trim().min(3, 'Enter your username or email'),
  password: z.string().min(1, 'Password is required'),
});

export const guestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_ ]+$/, 'Invalid guest name')
    .optional(),
});
