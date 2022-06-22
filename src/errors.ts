import { TRPCError } from '@trpc/server';

export function getErrorFromUnknown(cause: unknown): TRPCError {
  if (cause instanceof Error && cause.name === 'TRPCError') {
    return cause as TRPCError;
  }
  const err = new TRPCError({
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    cause,
  });

  // take stack trace from cause
  if (cause instanceof Error) {
    err.stack = cause.stack;
  }
  return err;
}
