import { z } from 'zod';

export const credentialsSchema = z.object({ email: z.string().email('Enter a valid email.'), password: z.string().min(1, 'Password is required.') });
export const passwordSchema = z.object({ password: z.string().min(12, 'Password must be at least 12 characters.') });
export const profileSchema = z.object({ name: z.string().min(1, 'Name is required.'), locale: z.string().min(1), timezone: z.string().min(1) });
