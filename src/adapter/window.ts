import { AnyProcedure, AnyRouter, ProcedureType, TRPCError } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import type { NodeHTTPCreateContextOption } from '@trpc/server/dist/adapters/node-http/types';
// eslint-disable-next-line import/no-unresolved
import type { BaseHandlerOptions } from '@trpc/server/dist/internals/types';
import { Unsubscribable, isObservable } from '@trpc/server/observable';

import { isTRPCRequestWithId } from '../shared/trpcMessage';
import type { MinimalWindow, TRPCChromeResponse } from '../types';
import { getErrorFromUnknown } from './errors';

export type CreateWindowContextOptions = {
  req: { origin: string };
  res: undefined;
};

export type CreateWindowHandlerOptions<TRouter extends AnyRouter> = Pick<
  BaseHandlerOptions<TRouter, CreateWindowContextOptions['req']> &
    NodeHTTPCreateContextOption<
      TRouter,
      CreateWindowContextOptions['req'],
      CreateWindowContextOptions['res']
    >,
  'router' | 'createContext' | 'onError'
> & {
  /**
   * Window to listen to messages on
   * @default global.window
   */
  listenWindow?: MinimalWindow;
  /**
   * Window to post messages to
   * @default event.source
   * @example
   * ```
   * // if you want to post messages to the parent window
   * createWindowHandler({
   *  postWindow: window.parent,
   * })
   * ```
   */
  postWindow?: MinimalWindow;
};

export const createWindowHandler = <TRouter extends AnyRouter>(
  opts: CreateWindowHandlerOptions<TRouter>,
) => {
  const {
    router,
    createContext,
    onError,
    // make this ssr save
    listenWindow = typeof window !== 'undefined' ? global.window : undefined,
  } = opts;

  if (!listenWindow) {
    console.warn("[SSR] skip creating window handler as 'listenWindow' is not defined");
    return;
  }

  const { transformer } = router._def._config;

  const subscriptions = new Map<number | string, Unsubscribable>();
  const listeners: (() => void)[] = [];

  const onDisconnect = () => {
    listeners.forEach((unsub) => unsub());
  };

  listenWindow.addEventListener('beforeunload', onDisconnect);
  listeners.push(() => {
    listenWindow.removeEventListener('beforeunload', onDisconnect);
  });

  const onMessage = async (event: MessageEvent<unknown>) => {
    const { data: message, source } = event;
    const { postWindow = source } = opts;
    if (!postWindow) return;
    if (!isTRPCRequestWithId(message)) return;
    const { trpc } = message;

    const { id, jsonrpc, method } = trpc;

    const sendResponse = (response: TRPCChromeResponse['trpc']) => {
      postWindow.postMessage({
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

      ctx = await createContext?.({ req: { origin: event.origin }, res: undefined });
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
            req: { origin: event.origin },
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
        req: { origin: event.origin },
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

  listenWindow.addEventListener('message', onMessage);
  listeners.push(() => listenWindow.removeEventListener('message', onMessage));
};
