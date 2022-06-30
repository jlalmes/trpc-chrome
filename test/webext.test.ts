/* eslint-disable @typescript-eslint/unbound-method */
import { createTRPCClient } from '@trpc/client';
import * as trpc from '@trpc/server';
import { z } from 'zod';

import { chromeLink, createChromeHandler } from '../src';
import { resetMocks } from './setup';

global.fetch = {} as any;

const appRouter = trpc
  .router()
  .query('echo', {
    input: z.object({ payload: z.string() }),
    resolve: ({ input }) => input.payload,
  })
  .mutation('echo', {
    input: z.object({ payload: z.string() }),
    resolve: ({ input }) => input.payload,
  })
  .subscription('echo', {
    input: z.object({ payload: z.string() }),
    resolve: ({ input }) => {
      return new trpc.Subscription<typeof input.payload>((emit) => {
        emit.data(input.payload);
        return () => undefined;
      });
    },
  });

afterEach(() => {
  resetMocks();
});

test('query', async () => {
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  let handlerPort: chrome.runtime.Port | undefined;
  chrome.runtime.onConnect.addListener((port) => {
    handlerPort = port;
  });

  const linkPort = chrome.runtime.connect({});
  const trpcClient = createTRPCClient<typeof appRouter>({
    links: [chromeLink({ port: linkPort })],
  });

  expect(chrome.runtime.connect).toHaveBeenCalledTimes(1);
  expect(handlerPort).toBeDefined();
  expect(handlerPort!.onMessage.addListener).toHaveBeenCalledTimes(1);

  const promise = trpcClient.query('echo', { payload: 'query' });

  expect(linkPort.onMessage.addListener).toHaveBeenCalledTimes(1);
  expect(linkPort.onDisconnect.addListener).toHaveBeenCalledTimes(1);
  expect(linkPort.postMessage).toHaveBeenCalledTimes(1);
  expect(linkPort.postMessage).toHaveBeenNthCalledWith(1, {
    trpc: {
      id: 1,
      method: 'query',
      params: {
        path: 'echo',
        input: {
          payload: 'query',
        },
      },
    },
  });

  const data = await promise;

  expect(handlerPort!.onMessage.addListener).toHaveBeenCalledTimes(1);
  expect(handlerPort!.postMessage).toHaveBeenCalledTimes(1);
  expect(handlerPort!.postMessage).toHaveBeenNthCalledWith(1, {
    trpc: {
      id: 1,
      result: {
        type: 'data',
        data: 'query',
      },
    },
  });

  expect(data).toBe('query');
});

test('mutation', async () => {
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  let handlerPort: chrome.runtime.Port | undefined;
  chrome.runtime.onConnect.addListener((port) => {
    handlerPort = port;
  });

  const linkPort = chrome.runtime.connect({});
  const trpcClient = createTRPCClient<typeof appRouter>({
    links: [chromeLink({ port: linkPort })],
  });

  expect(chrome.runtime.connect).toHaveBeenCalledTimes(1);
  expect(handlerPort).toBeDefined();
  expect(handlerPort!.onMessage.addListener).toHaveBeenCalledTimes(1);

  const promise = trpcClient.mutation('echo', { payload: 'mutation' });

  expect(linkPort.onMessage.addListener).toHaveBeenCalledTimes(1);
  expect(linkPort.onDisconnect.addListener).toHaveBeenCalledTimes(1);
  expect(linkPort.postMessage).toHaveBeenCalledTimes(1);
  expect(linkPort.postMessage).toHaveBeenNthCalledWith(1, {
    trpc: {
      id: 2,
      method: 'mutation',
      params: {
        path: 'echo',
        input: {
          payload: 'mutation',
        },
      },
    },
  });

  const data = await promise;

  expect(handlerPort!.onMessage.addListener).toHaveBeenCalledTimes(1);
  expect(handlerPort!.postMessage).toHaveBeenCalledTimes(1);
  expect(handlerPort!.postMessage).toHaveBeenNthCalledWith(1, {
    trpc: {
      id: 2,
      result: {
        type: 'data',
        data: 'mutation',
      },
    },
  });

  expect(data).toBe('mutation');
});

test('subscription', async () => {
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  let handlerPort: chrome.runtime.Port | undefined;
  chrome.runtime.onConnect.addListener((port) => {
    handlerPort = port;
  });

  const linkPort = chrome.runtime.connect({});
  const trpcClient = createTRPCClient<typeof appRouter>({
    links: [chromeLink({ port: linkPort })],
  });

  expect(chrome.runtime.connect).toHaveBeenCalledTimes(1);
  expect(handlerPort).toBeDefined();
  expect(handlerPort!.onMessage.addListener).toHaveBeenCalledTimes(1);

  const onNextMock = jest.fn();
  const onErrorMock = jest.fn();
  const onDoneMock = jest.fn();

  const promise = new Promise<{ data: string; unsubscribe: () => void }>((resolve) => {
    const unsubscribe = trpcClient.subscription(
      'echo',
      { payload: 'subscription' },
      {
        onNext: (result) => {
          onNextMock(result);
          if (result.type === 'data') {
            resolve({ data: result.data, unsubscribe });
          }
        },
        onError: onErrorMock,
        onDone: onDoneMock,
      },
    );
  });

  expect(linkPort.onMessage.addListener).toHaveBeenCalledTimes(1);
  expect(linkPort.onDisconnect.addListener).toHaveBeenCalledTimes(1);
  expect(linkPort.postMessage).toHaveBeenCalledTimes(1);
  expect(linkPort.postMessage).toHaveBeenNthCalledWith(1, {
    trpc: {
      id: 3,
      method: 'subscription',
      params: {
        path: 'echo',
        input: {
          payload: 'subscription',
        },
      },
    },
  });

  const { data, unsubscribe } = await promise;

  expect(handlerPort!.onMessage.addListener).toHaveBeenCalledTimes(1);
  expect(handlerPort!.postMessage).toHaveBeenCalledTimes(2);
  expect(handlerPort!.postMessage).toHaveBeenNthCalledWith(1, {
    trpc: {
      id: 3,
      result: {
        type: 'started',
      },
    },
  });
  expect(handlerPort!.postMessage).toHaveBeenNthCalledWith(2, {
    trpc: {
      id: 3,
      result: {
        type: 'data',
        data: 'subscription',
      },
    },
  });

  expect(data).toBe('subscription');

  unsubscribe();
  expect(handlerPort!.postMessage).toHaveBeenCalledTimes(3);
  expect(handlerPort!.postMessage).toHaveBeenNthCalledWith(3, {
    trpc: {
      id: 3,
      result: {
        type: 'stopped',
      },
    },
  });
});
