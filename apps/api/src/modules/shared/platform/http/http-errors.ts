export interface HttpStatusError extends Error {
  readonly statusCode: number;
}

function createHttpStatusError(statusCode: number, message: string): HttpStatusError {
  return Object.assign(new Error(message), {
    name: "HttpStatusError",
    statusCode,
  });
}

export function unauthorizedError(message = "Unauthorized"): HttpStatusError {
  return createHttpStatusError(401, message);
}

export function forbiddenError(message = "Forbidden"): HttpStatusError {
  return createHttpStatusError(403, message);
}
