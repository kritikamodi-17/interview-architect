import type { Context } from "hono";
import { z } from "zod";

export function errorResponse(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
  code: string,
  message: string,
  details?: unknown
) {
  return c.json(
    {
      message,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details })
      }
    },
    status
  );
}

export async function parseJson<T extends z.ZodType>(
  c: Context,
  schema: T
): Promise<{ success: true; data: z.output<T> } | { success: false; response: Response }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return {
      success: false,
      response: errorResponse(c, 400, "invalid_json", "Request body must be valid JSON.")
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: errorResponse(c, 422, "validation_error", "Request body is invalid.", parsed.error.issues)
    };
  }
  return { success: true, data: parsed.data };
}

export function parseRouteId(value: string | undefined): string | undefined {
  if (!value || value.length > 160 || !/^[a-zA-Z0-9][a-zA-Z0-9_:-]*$/.test(value)) return undefined;
  return value;
}
