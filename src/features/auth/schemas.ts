import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "Escreve o email." })
    .trim()
    .toLowerCase()
    .min(1, "Escreve o email.")
    .pipe(z.email("Email inválido.")),
  password: z.string({ error: "Escreve a password." }).min(1, "Escreve a password."),
});
