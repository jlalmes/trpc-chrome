/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { MinimalWindow } from '../src/types';

type OnMessageListener = (message: any) => void;
type OnConnectListener = (port: any) => void;

const getMockChrome = jest.fn(() => {
  const linkPortOnMessageListeners: OnMessageListener[] = [];
  const handlerPortOnMessageListeners: OnMessageListener[] = [];
  const handlerPortOnConnectListeners: OnConnectListener[] = [];

  const handlerPort = {
    postMessage: jest.fn((message) => {
      linkPortOnMessageListeners.forEach((listener) => listener(message));
    }),
    onMessage: {
      addListener: jest.fn((listener) => {
        handlerPortOnMessageListeners.push(listener);
      }),
      removeListener: jest.fn((listener) => {
        const index = handlerPortOnMessageListeners.indexOf(listener);
        if (index > -1) {
          handlerPortOnMessageListeners.splice(index, 1);
        }
      }),
    },
    onDisconnect: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  };

  return {
    __handlerPort: handlerPort,
    runtime: {
      connect: jest.fn(() => {
        const linkPort = {
          postMessage: jest.fn((message) => {
            handlerPortOnMessageListeners.forEach((listener) => listener(message));
          }),
          onMessage: {
            addListener: jest.fn((listener) => {
              linkPortOnMessageListeners.push(listener);
            }),
            removeListener: jest.fn((listener) => {
              const index = linkPortOnMessageListeners.indexOf(listener);
              if (index > -1) {
                linkPortOnMessageListeners.splice(index, 1);
              }
            }),
          },
          onDisconnect: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
          },
        };

        handlerPortOnConnectListeners.forEach((listener) => listener(handlerPort));

        return linkPort;
      }),
      onConnect: {
        addListener: jest.fn((listener) => {
          handlerPortOnConnectListeners.push(listener);
        }),
      },
    },
  };
});

export const resetMocks = () => {
  // @ts-expect-error mocking chrome
  global.chrome = getMockChrome();
};

resetMocks();

export const getMockWindow = (): MinimalWindow => {
  const listeners: ((event: MessageEvent) => void)[] = [];

  return {
    addEventListener: jest.fn((event, listener: EventListener) => {
      if (event !== 'message') return;
      listeners.push(listener);
    }),
    removeEventListener: jest.fn((event, listener: EventListener) => {
      if (event !== 'message') return;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }),
    postMessage: jest.fn((message) => {
      listeners.forEach((listener) => listener({ data: message } as any));
    }),
  };
};
