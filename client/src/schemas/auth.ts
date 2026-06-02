import { z } from 'zod'

// Login — sadə: email düzgün olsun, şifrə boş olmasın
export const loginSchema = z.object({
  email: z
    .string()
    .trim()                          // boşluqları özü təmizləyir
    .min(1, 'Email daxil et')
    .email('Email düzgün görünmür'), // qınamır, təsvir edir
  password: z
    .string()
    .min(1, 'Şifrəni daxil et'),
})
// Register — role-a görə şərti sahələr
export const registerSchema = z
  .object({
    role: z.enum(['student', 'teacher', 'parent']),
    name:    z.string().trim().min(2, 'Ad ən az 2 hərf olmalıdır'),
    surname: z.string().trim().min(2, 'Soyad ən az 2 hərf olmalıdır'),
    email:   z.string().trim().min(1, 'Email daxil et').email('Email düzgün görünmür'),
    phone:   z.string().trim().min(7, 'Telefon nömrəsi çox qısadır').max(20, 'Telefon çox uzundur'),
    password:        z.string().min(6, 'Şifrə ən az 6 simvol olmalıdır'),
    confirmPassword: z.string().min(1, 'Şifrəni təkrar yaz'),
    ageGroup:   z.enum(['3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+']).optional(),
    specialty:  z.string().trim().optional(),
    experience: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifrələr uyğun gəlmir',
    path: ['confirmPassword'],          // səhvi hansı sahəyə yapışdırsın
  })
  .superRefine((d, ctx) => {
    // role-a görə əlavə tələblər
    if (d.role === 'student' && !d.ageGroup) {
      ctx.addIssue({ code: 'custom', message: 'Yaş qrupunu seç', path: ['ageGroup'] })
    }
    if (d.role === 'teacher' && !d.specialty) {
      ctx.addIssue({ code: 'custom', message: 'İxtisas daxil et', path: ['specialty'] })
    }
  })

export type RegisterValues = z.infer<typeof registerSchema>
export type LoginValues = z.infer<typeof loginSchema>
