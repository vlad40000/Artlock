import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

interface ApiErrorOptions {
  route: string;
  status?: number;
  message?: string;
}

export function apiErrorResponse(error: unknown, options: ApiErrorOptions) {
  const requestId = randomUUID();
  const status = options.status ?? 500;
  
  function shouldRetry(status: number) {
    if (status && [429, 500, 502, 503, 504].includes(status)) return true;
    return false;
  }

  let errorMessage = options.message ?? 'Request failed. Please try again.';
  
  // If we're in development or if no custom message was provided, 
  // try to extract a more useful message from the error object
  if (!options.message && error instanceof Error) {
    errorMessage = error.message;
  } else if (!options.message && typeof error === 'string') {
    errorMessage = error;
  }

  console.error(`[api:${options.route}] ${requestId}`, error);

  return NextResponse.json(
    {
      error: errorMessage,
      requestId,
    },
    { status },
  );
}
