import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your work email and password to continue.')
    .email('Enter a valid work email address.'),
  password: z.string().min(1, 'Enter your work email and password to continue.'),
})
