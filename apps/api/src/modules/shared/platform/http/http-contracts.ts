import { z, type ZodTypeAny } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime();
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const sortDirectionSchema = z.enum(["asc", "desc"]).default("desc");
export const errorResponseSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

export interface HttpSchemaCatalog<
  TParams extends Record<string, ZodTypeAny> = Record<string, never>,
  TQueries extends Record<string, ZodTypeAny> = Record<string, never>,
  TBodies extends Record<string, ZodTypeAny> = Record<string, never>,
  TResponses extends Record<string, ZodTypeAny> = Record<string, never>,
> {
  readonly params: TParams;
  readonly queries: TQueries;
  readonly bodies: TBodies;
  readonly responses: TResponses;
}

export function defineHttpSchemaCatalog<
  const TParams extends Record<string, ZodTypeAny>,
  const TQueries extends Record<string, ZodTypeAny>,
  const TBodies extends Record<string, ZodTypeAny>,
  const TResponses extends Record<string, ZodTypeAny>,
>(catalog: HttpSchemaCatalog<TParams, TQueries, TBodies, TResponses>) {
  return catalog;
}

export function paginatedItemsResponseSchema<TItem extends ZodTypeAny>(itemSchema: TItem) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  });
}
