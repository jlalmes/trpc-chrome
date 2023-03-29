import type { TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

import type { MinimalWindow, TRPCChromeMessage } from '../types';
import { createBaseLink } from './internal/base';

export type WindowLinkOptions = {
  window: MinimalWindow;
};

export const windowLink = <TRouter extends AnyRouter>(
  opts: WindowLinkOptions,
): TRPCLink<TRouter> => {
  const handlerMap = new Map<
    (message: TRPCChromeMessage) => void,
    (ev: MessageEvent<TRPCChromeMessage>) => void
  >();

  return createBaseLink({
    postMessage(message) {
      opts.window.postMessage(message, '*');
    },
    addMessageListener(listener) {
      const handler = (ev: MessageEvent<TRPCChromeMessage>) => {
        listener(ev.data);
      };
      handlerMap.set(listener, handler);
      opts.window.addEventListener('message', handler);
    },
    removeMessageListener(listener) {
      const handler = handlerMap.get(listener);
      if (handler) {
        opts.window.removeEventListener('message', handler);
      }
    },
    addCloseListener(listener) {
      opts.window.addEventListener('beforeunload', listener);
    },
    removeCloseListener(listener) {
      opts.window.removeEventListener('beforeunload', listener);
    },
  });
};
