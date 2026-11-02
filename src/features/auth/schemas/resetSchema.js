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
    token: z
      .string()
      .trim()
      .min(16, 'Enter a valid reset token (at least 16 characters).'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
