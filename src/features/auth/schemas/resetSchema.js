import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your work email to receive a reset link.')
    .email('Enter a valid work email address.'),
})

export const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
