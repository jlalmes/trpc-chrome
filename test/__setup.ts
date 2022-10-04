/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

type OnMessageListener = (message: any) => void;
type OnConnectListener = (port: any) => void;

const getMockChrome = jest.fn(() => {
  const linkPortOnMessageListeners: OnMessageListener[] = [];
  const handlerPortOnMessageListeners: OnMessageListener[] = [];
  const handlerPortOnConnectListeners: OnConnectListener[] = [];

  return {
    runtime: {
      connect: jest.fn(() => {
        const handlerPort = {
          postMessage: jest.fn((message) => {
            linkPortOnMessageListeners.forEach((listener) => listener(message));
          }),
          onMessage: {
            addListener: jest.fn((listener) => {
              handlerPortOnMessageListeners.push(listener);
            }),
            removeListener: jest.fn(),
          },
          onDisconnect: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
          },
        };

        const linkPort = {
          postMessage: jest.fn((message) => {
            handlerPortOnMessageListeners.forEach((listener) => listener(message));
          }),
          onMessage: {
            addListener: jest.fn((listener) => {
              linkPortOnMessageListeners.push(listener);
            }),
            removeListener: jest.fn(),
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
