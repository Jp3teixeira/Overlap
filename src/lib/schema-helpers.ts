import { z } from "zod";

/** Os formulários enviam "" para campos vazios; na BD isso é null. */
const emptyToNull = (v: unknown) =>
  v === "" || v === undefined || (typeof v === "string" && v.trim() === "") ? null : v;

/** Texto opcional: aparado, "" → null, com limite de caracteres. */
export const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `Máximo de ${max} caracteres.`).nullable());

/** Texto obrigatório, aparado. */
export const requiredText = (max: number, emptyMessage: string) =>
  z
    .string({ error: emptyMessage })
    .trim()
    .min(1, emptyMessage)
    .max(max, `Máximo de ${max} caracteres.`);

/** Inteiro opcional vindo de um input: "" → null, "7" → 7. */
export const optionalInt = (min: number, max: number, rangeMessage: string) =>
  z.preprocess(
    (v) => {
      const n = emptyToNull(v);
      return typeof n === "string" ? Number(n) : n;
    },
    z
      .number({ error: rangeMessage })
      .int(rangeMessage)
      .min(min, rangeMessage)
      .max(max, rangeMessage)
      .nullable(),
  );

/** Inteiro obrigatório vindo de um input. */
export const requiredInt = (min: number, max: number, rangeMessage: string) =>
  z.coerce
    .number({ error: rangeMessage })
    .int(rangeMessage)
    .min(min, rangeMessage)
    .max(max, rangeMessage);

/** Data no formato das colunas `date`. */
export const isoDate = z.iso.date({ error: "Data inválida." });

/** Hora opcional "HH:MM". */
export const optionalTime = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (usa HH:MM).")
    .nullable(),
);

/** Link opcional, só https. */
export const optionalHttpsUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^https:\/\/\S+$/, "O link tem de começar por https://")
    .nullable(),
);

export const uuid = z.uuid({ error: "Identificador inválido." });
export const optionalUuid = z.preprocess(emptyToNull, uuid.nullable());

/** Lista sem repetidos. */
export const uniqueList = <T extends z.ZodType>(item: T) =>
  z.array(item).transform((arr) => Array.from(new Set(arr)) as z.infer<T>[]);
