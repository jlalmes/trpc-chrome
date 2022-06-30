import { TRPCClientError, TRPCLink } from '@trpc/client';
// eslint-disable-next-line import/no-unresolved
import type { ObservableCallbacks } from '@trpc/client/dist/declarations/src/internals/observable';
import { AnyRouter, ProcedureType } from '@trpc/server';
import { TRPCErrorResponse, TRPCResult } from '@trpc/server/rpc';

import { TRPCChromeRequest, TRPCChromeResponse } from './types';

export type ChromeLinkOptions = {
  port: chrome.runtime.Port;
};

type PendingRequest<TRouter extends AnyRouter> = {
  type: ProcedureType;
  callbacks: ObservableCallbacks<TRPCResult, TRPCClientError<TRouter> | TRPCErrorResponse>;
};

export const chromeLink = <TRouter extends AnyRouter>(
  opts: ChromeLinkOptions,
): TRPCLink<TRouter> => {
  return () => {
    const { port } = opts;

    const pendingRequests: Record<number | string, PendingRequest<TRouter>> = {};

    port.onMessage.addListener((message: TRPCChromeResponse) => {
      const msg = message?.trpc;
      if (!msg) return;

      const pendingRequest = msg.id !== null && pendingRequests[msg.id];
      if (!pendingRequest) return;

      if ('error' in msg) {
        pendingRequest.callbacks.onError?.(msg);
        return;
      }

      pendingRequest.callbacks.onNext?.(msg.result);

      if (msg.result.type === 'stopped') {
        pendingRequest.callbacks.onDone?.();
      }
    });

    port.onDisconnect.addListener(() => {
      for (const id of Object.keys(pendingRequests)) {
        const pendingRequest = pendingRequests[id]!;
        pendingRequest.callbacks.onError?.(
          new TRPCClientError('Chrome port closed prematurely', {
            result: undefined,
          }),
        );

        if (pendingRequest.type === 'subscription') {
          delete pendingRequests[id];
          pendingRequest.callbacks.onDone?.();
        }
      }
    });

    return ({ op, prev, onDestroy }) => {
      const { id, type, path, input } = op;
      let isDone = false;

      const unsubscribe = () => {
        const callbacks = pendingRequests[id]?.callbacks;
        delete pendingRequests[id];
        callbacks?.onDone?.();

        if (type === 'subscription') {
          port.postMessage({
            trpc: {
              id,
              jsonrpc: undefined,
              method: 'subscription.stop',
              params: undefined,
            },
          } as TRPCChromeRequest);
        }
      };

      pendingRequests[id] = {
        type,
        callbacks: {
          onNext: (result) => {
            if (isDone) return;
            prev(result);

            if (type !== 'subscription') {
              isDone = true;
              unsubscribe();
            }
          },
          onError: (cause) => {
            if (isDone) return;
            const error = cause instanceof Error ? cause : TRPCClientError.from(cause);
            prev(error);
          },
          onDone: () => {
            if (isDone) return;
            prev(
              new TRPCClientError('Operation ended prematurely', {
                result: undefined,
                isDone: true,
              }),
            );
            isDone = true;
          },
        },
      };

      port.postMessage({
        trpc: {
          id,
          jsonrpc: undefined,
          method: type,
          params: {
            path,
            input,
          },
        },
      } as TRPCChromeRequest);

      onDestroy(() => {
        isDone = true;
        unsubscribe();
      });
    };
  };
};
