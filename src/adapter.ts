import { AnyRouter, Subscription, TRPCError } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { NodeHTTPCreateContextOption } from '@trpc/server/dist/declarations/src/adapters/node-http';
// eslint-disable-next-line import/no-unresolved
import { HTTPBaseHandlerOptions } from '@trpc/server/dist/declarations/src/http/internals/types';
import { TRPCErrorShape, TRPCResult } from '@trpc/server/rpc';

import { getErrorFromUnknown } from './errors';
import { TRPCChromeRequest, TRPCChromeResponse } from './types';

export type CreateChromeContextOptions = {
  req: chrome.runtime.Port;
  res: undefined;
};

export type CreateChromeHandlerOptions<TRouter extends AnyRouter> = Pick<
  HTTPBaseHandlerOptions<TRouter, CreateChromeContextOptions['req']> & {
    teardown?: () => Promise<void>;
  } & NodeHTTPCreateContextOption<
      TRouter,
      CreateChromeContextOptions['req'],
      CreateChromeContextOptions['res']
    >,
  'router' | 'createContext' | 'onError' | 'teardown'
>;

export const createChromeHandler = <TRouter extends AnyRouter>(
  opts: CreateChromeHandlerOptions<TRouter>,
) => {
  const { router, createContext, onError, teardown } = opts;

  chrome.runtime.onConnect.addListener((port) => {
    const subscriptions = new Map<number | string, Subscription>();

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    port.onMessage.addListener(async (message: TRPCChromeRequest) => {
      const msg = message?.trpc;
      if (!msg) return;

      const handleRequest = async () => {
        const sendResponse = (json: { result: TRPCResult } | { error: TRPCErrorShape }) => {
          return port.postMessage({
            trpc: {
              id: msg.id ?? null,
              jsonrpc: msg.jsonrpc,
              ...json,
            },
          } as TRPCChromeResponse);
        };

        let ctx: any;
        let result: any;

        try {
          if (typeof msg.id !== 'number' && typeof msg.id !== 'string') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '`id` is required',
            });
          }

          if (msg.method === 'subscription.stop') {
            const subscription = subscriptions.get(msg.id);
            if (subscription) {
              subscription.destroy();
            }
            subscriptions.delete(msg.id);
            return;
          }

          const { path, input } = msg.params;
          const type = msg.method;

          ctx = await createContext?.({ req: port, res: undefined });
          const caller = router.createCaller(ctx);
          result = await caller[type](path, input as any);

          if (!(result instanceof Subscription)) {
            return sendResponse({
              result: {
                type: 'data',
                data: result,
              },
            });
          }

          const subscription = result;

          if (subscriptions.has(msg.id)) {
            subscription.destroy();
            throw new TRPCError({
              message: `Duplicate id ${msg.id}`,
              code: 'BAD_REQUEST',
            });
          }

          subscriptions.set(msg.id, subscription);

          subscription.on('data', (data: unknown) => {
            sendResponse({
              result: {
                type: 'data',
                data,
              },
            });
          });

          subscription.on('error', (cause: unknown) => {
            const error = getErrorFromUnknown(cause);

            onError?.({
              error,
              type,
              path,
              input,
              ctx,
              req: port,
            });

            sendResponse({
              error: router.getErrorShape({
                error,
                type,
                path,
                input,
                ctx,
              }),
            });
          });

          subscription.on('destroy', () => {
            sendResponse({
              result: {
                type: 'stopped',
              },
            });
          });

          sendResponse({
            result: {
              type: 'started',
            },
          });
        } catch (cause) {
          const error = getErrorFromUnknown(cause);

          onError?.({
            error,
            type: (msg.method as any) ?? 'unknown',
            path: (msg.params as any)?.path,
            input: (msg.params as any)?.input,
            ctx,
            req: port,
          });

          sendResponse({
            error: router.getErrorShape({
              error,
              type: (msg.method as any) ?? 'unknown',
              path: (msg.params as any)?.path,
              input: (msg.params as any)?.input,
              ctx,
            }),
          });
        }
      };

      await handleRequest();
      await teardown?.();
    });
  });
};
