import type { TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

import type { MinimalPopupWindow, MinimalWindow, TRPCChromeMessage } from '../types';
import { createBaseLink } from './internal/base';

export type PopupLinkOptions = {
  createPopup: () => MinimalPopupWindow;
  listenWindow: MinimalWindow;
};

export const popupLink = <TRouter extends AnyRouter>(opts: PopupLinkOptions): TRPCLink<TRouter> => {
  const messageHandlerMap = new Map<
    (message: TRPCChromeMessage) => void,
    (ev: MessageEvent<TRPCChromeMessage>) => void
  >();
  const popupHandlerMap = new Map<'beforeunload', (ev: BeforeUnloadEvent) => void>();

  let popupWindow: MinimalPopupWindow | null = null;
  function attachHandlerMap() {
    if (!popupWindow) {
      return;
    }
    for (const [event, handler] of popupHandlerMap) {
      popupWindow.addEventListener(event, handler);
    }
  }
  function detachHandlerMap() {
    if (!popupWindow) {
      return;
    }
    for (const [event, handler] of popupHandlerMap) {
      popupWindow.removeEventListener(event, handler);
    }
  }
  async function getPopup() {
    if (!popupWindow || popupWindow.closed) {
      popupWindow = opts.createPopup();
      // wait til window is loaded
      await new Promise((resolve) => {
        popupWindow?.addEventListener('load', resolve);
      });

      // subscribe to close events
      attachHandlerMap();

      // subscribe to popup closing
      popupWindow.addEventListener('beforeunload', () => {
        popupWindow = null;
      });
    }
    return popupWindow;
  }

  return createBaseLink({
    postMessage(message) {
      return getPopup().then(
        (popup) => {
          return popup.postMessage(message, '*');
        },
        () => {
          throw new Error('Could not open popup');
        },
      );
    },
    addMessageListener(listener) {
      const handler = (ev: MessageEvent<TRPCChromeMessage>) => {
        listener(ev.data);
      };
      messageHandlerMap.set(listener, handler);
      opts.listenWindow.addEventListener('message', handler);
    },
    removeMessageListener(listener) {
      const handler = messageHandlerMap.get(listener);
      if (handler) {
        opts.listenWindow.removeEventListener('message', handler);
      }
    },
    addCloseListener(listener) {
      opts.listenWindow.addEventListener('beforeunload', listener);
      popupHandlerMap.set('beforeunload', listener);
      attachHandlerMap();
    },
    removeCloseListener(listener) {
      opts.listenWindow.removeEventListener('beforeunload', listener);
      popupHandlerMap.delete('beforeunload');
      detachHandlerMap();
    },
  });
};
