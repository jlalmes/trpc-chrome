import type { TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

import type { MinimalPopupWindow, MinimalWindow, TRPCChromeMessage } from '../types';
import { createBaseLink } from './internal/base';

export type PopupLinkOptions = {
  createPopup: () => MinimalPopupWindow;
  listenWindow: MinimalWindow;
  postOrigin?: string;
};

export const popupLink = <TRouter extends AnyRouter>(opts: PopupLinkOptions): TRPCLink<TRouter> => {
  const messageHandlerMap = new Map<
    (message: TRPCChromeMessage) => void,
    (ev: MessageEvent<TRPCChromeMessage>) => void
  >();
  const closeHandlerSet = new Set<() => void>();

  let popupWindow: MinimalPopupWindow | null = null;
  async function getPopup() {
    if (!popupWindow || popupWindow.closed) {
      popupWindow = opts.createPopup();
      // wait til window is loaded
      await Promise.race([
        new Promise((resolve) => {
          popupWindow?.addEventListener?.('load', resolve);
        }),
        // expect the popup to load within 2.5s, this is needed for cross-origin popups as they don't have a load event
        new Promise((resolve) => {
          setTimeout(resolve, 2500);
        }),
      ]);

      // subscribe to popup closing
      try {
        if (!popupWindow.addEventListener) {
          throw new Error('popupWindow.addEventListener is not a function');
        }
        popupWindow.addEventListener('beforeunload', () => {
          popupWindow = null;
        });
      } catch {
        // this throws on cross-origin popups, fallback to polling to check if popup is closed
        const pid = setInterval(() => {
          if (popupWindow && popupWindow.closed) {
            popupWindow = null;
            closeHandlerSet.forEach((handler) => {
              handler();
            });
            clearInterval(pid);
          }
        }, 1000);
      }
    }

    return popupWindow;
  }

  return createBaseLink({
    async postMessage(message) {
      const popup = await getPopup();
      return popup.postMessage(message, {
        targetOrigin: opts.postOrigin,
      });
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
      closeHandlerSet.add(listener);
    },
    removeCloseListener(listener) {
      opts.listenWindow.removeEventListener('beforeunload', listener);
      closeHandlerSet.delete(listener);
    },
  });
};
