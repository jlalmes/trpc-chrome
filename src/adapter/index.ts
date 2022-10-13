import { AnyProcedure, AnyRouter, ProcedureType, TRPCError } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import type { NodeHTTPCreateContextOption } from '@trpc/server/dist/adapters/node-http/types';
// eslint-disable-next-line import/no-unresolved
import type { BaseHandlerOptions } from '@trpc/server/dist/internals/types';
import { Unsubscribable, isObservable } from '@trpc/server/observable';

import type { TRPCChromeRequest, TRPCChromeResponse } from '../types';
import { getErrorFromUnknown } from './errors';

export type CreateChromeContextOptions = {
  req: chrome.runtime.Port;
  res: undefined;
};

export type CreateChromeHandlerOptions<TRouter extends AnyRouter> = Pick<
  BaseHandlerOptions<TRouter, CreateChromeContextOptions['req']> &
    NodeHTTPCreateContextOption<
      TRouter,
      CreateChromeContextOptions['req'],
      CreateChromeContextOptions['res']
    >,
  'router' | 'createContext' | 'onError'
>;

export const createChromeHandler = <TRouter extends AnyRouter>(
  opts: CreateChromeHandlerOptions<TRouter>,
) => {
  const { router, createContext, onError } = opts;
  const { transformer } = router._def._config;

  chrome.runtime.onConnect.addListener((port) => {
    const subscriptions = new Map<number | string, Unsubscribable>();
    const listeners: (() => void)[] = [];

    const onDisconnect = () => {
      listeners.forEach((unsub) => unsub());
    };

    port.onDisconnect.addListener(onDisconnect);
    listeners.push(() => port.onDisconnect.removeListener(onDisconnect));

    const onMessage = async (message: TRPCChromeRequest) => {
      if (!('trpc' in message)) return;
      const { trpc } = message;
      if (!('id' in trpc) || trpc.id === null || trpc.id === undefined) return;
      if (!trpc) return;

      const { id, jsonrpc, method } = trpc;

      const sendResponse = (response: TRPCChromeResponse['trpc']) => {
        port.postMessage({
          trpc: { id, jsonrpc, ...response },
        } as TRPCChromeResponse);
      };

      let params: { path: string; input: unknown } | undefined;
      let input: any;
      let ctx: any;

      try {
        if (method === 'subscription.stop') {
          const subscription = subscriptions.get(id);
          if (subscription) {
            subscription.unsubscribe();
            sendResponse({
              result: {
                type: 'stopped',
              },
            });
          }
          subscriptions.delete(id);
          return;
        }

        params = trpc.params;

        input = transformer.input.deserialize(params.input);

        ctx = await createContext?.({ req: port, res: undefined });
        const caller = router.createCaller(ctx);

        const segments = params.path.split('.');
        const procedureFn = segments.reduce(
          (acc, segment) => acc[segment],
          caller as any,
        ) as AnyProcedure;

        const result = await procedureFn(input);

        if (method !== 'subscription') {
          const data = transformer.output.serialize(result);
          sendResponse({
            result: {
              type: 'data',
              data,
            },
          });
          return;
        }

        if (!isObservable(result)) {
          throw new TRPCError({
            message: 'Subscription ${params.path} did not return an observable',
            code: 'INTERNAL_SERVER_ERROR',
          });
        }

        const subscription = result.subscribe({
          next: (data) => {
            sendResponse({
              result: {
                type: 'data',
                data,
              },
            });
          },
          error: (cause) => {
            const error = getErrorFromUnknown(cause);

            onError?.({
              error,
              type: method,
              path: params?.path,
              input,
              ctx,
              req: port,
            });

            sendResponse({
              error: router.getErrorShape({
                error,
                type: method,
                path: params?.path,
                input,
                ctx,
              }),
            });
          },
          complete: () => {
            sendResponse({
              result: {
                type: 'stopped',
              },
            });
          },
        });

        if (subscriptions.has(id)) {
          subscription.unsubscribe();
          sendResponse({
            result: {
              type: 'stopped',
            },
          });
          throw new TRPCError({
            message: `Duplicate id ${id}`,
            code: 'BAD_REQUEST',
          });
        }
        listeners.push(() => subscription.unsubscribe());

        subscriptions.set(id, subscription);

        sendResponse({
          result: {
            type: 'started',
          },
        });
        return;
      } catch (cause) {
        const error = getErrorFromUnknown(cause);

        onError?.({
          error,
          type: method as ProcedureType,
          path: params?.path,
          input,
          ctx,
          req: port,
        });

        sendResponse({
          error: router.getErrorShape({
            error,
            type: method as ProcedureType,
            path: params?.path,
            input,
            ctx,
          }),
        });
      }
    };

    port.onMessage.addListener(onMessage);
    listeners.push(() => port.onMessage.removeListener(onMessage));
  });
};
