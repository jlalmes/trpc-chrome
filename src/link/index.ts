import { TRPCClientError, TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import { observable } from '@trpc/server/observable';

import type { TRPCChromeRequest, TRPCChromeResponse } from '../types';

export type ChromeLinkOptions = {
  port: chrome.runtime.Port;
};

export const chromeLink = <TRouter extends AnyRouter>(
  opts: ChromeLinkOptions,
): TRPCLink<TRouter> => {
  return (runtime) => {
    const { port } = opts;
    return ({ op }) => {
      return observable((observer) => {
        const listeners: (() => void)[] = [];

        const { id, type, path } = op;

        try {
          const input = runtime.transformer.serialize(op.input);

          const onDisconnect = () => {
            observer.error(new TRPCClientError('Port disconnected prematurely'));
          };

          port.onDisconnect.addListener(onDisconnect);
          listeners.push(() => port.onDisconnect.removeListener(onDisconnect));

          const onMessage = (message: TRPCChromeResponse) => {
            if (!('trpc' in message)) return;
            const { trpc } = message;
            if (!trpc) return;
            if (!('id' in trpc) || trpc.id === null || trpc.id === undefined) return;
            if (id !== trpc.id) return;

            if ('error' in trpc) {
              const error = runtime.transformer.deserialize(trpc.error);
              observer.error(TRPCClientError.from({ ...trpc, error }));
              return;
            }

            observer.next({
              result: {
                ...trpc.result,
                ...((!trpc.result.type || trpc.result.type === 'data') && {
                  type: 'data',
                  data: runtime.transformer.deserialize(trpc.result.data),
                }),
              } as any,
            });

            if (type !== 'subscription' || trpc.result.type === 'stopped') {
              observer.complete();
            }
          };

          port.onMessage.addListener(onMessage);
          listeners.push(() => port.onMessage.removeListener(onMessage));

          port.postMessage({
            trpc: {
              id,
              jsonrpc: undefined,
              method: type,
              params: { path, input },
            },
          } as TRPCChromeRequest);
        } catch (cause) {
          observer.error(
            new TRPCClientError(cause instanceof Error ? cause.message : 'Unknown error'),
          );
        }

        return () => {
          listeners.forEach((unsub) => unsub());
          if (type === 'subscription') {
            port.postMessage({
              trpc: {
                id,
                jsonrpc: undefined,
                method: 'subscription.stop',
              },
            } as TRPCChromeRequest);
          }
        };
      });
    };
  };
};
