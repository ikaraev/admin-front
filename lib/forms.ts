import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues } from 'react-hook-form';
import { z } from 'zod';

/** react-hook-form bound to a zod schema; `handleSubmit` receives the schema's parsed output. */
export function useZodForm<S extends z.ZodTypeAny>(schema: S, defaultValues: DefaultValues<z.input<S>>) {
  return useForm<z.input<S>, unknown, z.output<S>>({ resolver: zodResolver(schema), defaultValues });
}

export const requiredText = (message = 'This field is required.') => z.string().trim().min(1, message);

/** Blank input becomes null: the API's nullable rules accept null but reject empty strings. */
export const optionalText = z.string().nullish().transform((value) => value?.trim() || null);

export const optionalUrl = optionalText.refine((value) => value === null || z.string().url().safeParse(value).success, 'Enter a valid URL.');

/** Number inputs report undefined when empty, so the key is omitted from the request. */
export const optionalNumber = z.number().optional();
/** Accepts undefined from an empty input (so new rows can start blank) but requires a number on submit. */
export const requiredNumber = (message = 'This field is required.', schema: z.ZodNumber = z.number()) => schema.optional().refine((value): value is number => value !== undefined, message);

export const splitList = (value: string | null | undefined): string[] => (value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);

/** Comma-separated text input submitted as a list, or null when blank (the API rejects empty lists). */
export const optionalList = z.string().nullish().transform((value) => {
  const entries = splitList(value);
  return entries.length ? entries : null;
});
