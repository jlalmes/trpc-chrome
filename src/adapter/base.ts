import type { AnyRouter } from '@trpc/server';
import type { NodeHTTPCreateContextOption } from '@trpc/server/dist/adapters/node-http/types';
import type { BaseHandlerOptions } from '@trpc/server/dist/internals/types';

export type CreateContextOptions = { req: unknown; res: unknown };
export type CreateHandlerOptions<
  TRouter extends AnyRouter,
  TContextOptions extends CreateContextOptions,
  TOptions = Record<never, never>,
> = Pick<
  BaseHandlerOptions<TRouter, TContextOptions['req']> &
    NodeHTTPCreateContextOption<TRouter, TContextOptions['req'], TContextOptions['res']>,
  'router' | 'createContext' | 'onError'
> &
  TOptions;

// TODO: share what's possible between adapters in a base implementation
