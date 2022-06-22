import { LinkRuntimeOptions } from '@trpc/client';

import { chromeLink } from '../src';

let messageListeners: ((message: any, port: chrome.runtime.Port) => void)[] = [];
let disconnectListeners: ((port: chrome.runtime.Port) => void)[] = [];
const port = {
  postMessage: jest.fn(),
  onMessage: {
    addListener: (callback: (message: any, port: chrome.runtime.Port) => void) => {
      messageListeners.push(callback);
    },
  },
  onDisconnect: {
    addListener: (callback: (port: chrome.runtime.Port) => void) => {
      disconnectListeners.push(callback);
    },
  },
} as unknown as chrome.runtime.Port;

const runtime: LinkRuntimeOptions = {} as any;
const opLinkOpts = {
  prev: jest.fn(),
  next: jest.fn(),
  onDestroy: jest.fn(),
};

describe('chromeLink', () => {
  afterEach(() => {
    (port.postMessage as jest.Mock).mockClear();
    opLinkOpts.prev.mockClear();
    opLinkOpts.next.mockClear();
    opLinkOpts.onDestroy.mockClear();
    messageListeners = [];
    disconnectListeners = [];
  });

  test('query', () => {
    const operationLink = chromeLink({ port })(runtime);

    expect(messageListeners.length).toBe(1);
    expect(disconnectListeners.length).toBe(1);
    expect(port.postMessage).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.prev).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.next).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.onDestroy).toHaveBeenCalledTimes(0);

    operationLink({
      ...opLinkOpts,
      op: {
        id: 1,
        type: 'query',
        path: 'path',
        input: 'input',
        context: {},
      },
    });

    expect(port.postMessage).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenNthCalledWith(1, {
      trpc: {
        id: 1,
        jsonrpc: undefined,
        method: 'query',
        params: {
          path: 'path',
          input: 'input',
        },
      },
    });
    expect(opLinkOpts.prev).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.next).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.onDestroy).toHaveBeenCalledTimes(1);

    messageListeners[0]!(
      {
        trpc: {
          id: 1,
          jsonrpc: undefined,
          result: {
            type: 'data',
            data: 'result.data',
          },
        },
      },
      port,
    );

    expect(opLinkOpts.prev).toHaveBeenCalledTimes(1);
    expect(opLinkOpts.prev).toHaveBeenNthCalledWith(1, {
      type: 'data',
      data: 'result.data',
    });

    expect(messageListeners.length).toBe(1);
    expect(disconnectListeners.length).toBe(1);
  });

  test('mutation', () => {
    const operationLink = chromeLink({ port })(runtime);

    expect(messageListeners.length).toBe(1);
    expect(disconnectListeners.length).toBe(1);
    expect(port.postMessage).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.prev).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.next).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.onDestroy).toHaveBeenCalledTimes(0);

    operationLink({
      ...opLinkOpts,
      op: {
        id: 2,
        type: 'mutation',
        path: 'path',
        input: 'input',
        context: {},
      },
    });

    expect(port.postMessage).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenNthCalledWith(1, {
      trpc: {
        id: 2,
        jsonrpc: undefined,
        method: 'mutation',
        params: {
          path: 'path',
          input: 'input',
        },
      },
    });
    expect(opLinkOpts.prev).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.next).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.onDestroy).toHaveBeenCalledTimes(1);

    messageListeners[0]!(
      {
        trpc: {
          id: 2,
          jsonrpc: undefined,
          result: {
            type: 'data',
            data: 'result.data',
          },
        },
      },
      port,
    );

    expect(opLinkOpts.prev).toHaveBeenCalledTimes(1);
    expect(opLinkOpts.prev).toHaveBeenNthCalledWith(1, {
      type: 'data',
      data: 'result.data',
    });

    expect(messageListeners.length).toBe(1);
    expect(disconnectListeners.length).toBe(1);
  });

  test('subscription', () => {
    const operationLink = chromeLink({ port })(runtime);

    expect(messageListeners.length).toBe(1);
    expect(disconnectListeners.length).toBe(1);
    expect(port.postMessage).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.prev).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.next).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.onDestroy).toHaveBeenCalledTimes(0);

    operationLink({
      ...opLinkOpts,
      op: {
        id: 3,
        type: 'subscription',
        path: 'path',
        input: 'input',
        context: {},
      },
    });

    expect(port.postMessage).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenNthCalledWith(1, {
      trpc: {
        id: 3,
        jsonrpc: undefined,
        method: 'subscription',
        params: {
          path: 'path',
          input: 'input',
        },
      },
    });
    expect(opLinkOpts.prev).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.next).toHaveBeenCalledTimes(0);
    expect(opLinkOpts.onDestroy).toHaveBeenCalledTimes(1);

    messageListeners[0]!(
      {
        trpc: {
          id: 3,
          jsonrpc: undefined,
          result: {
            type: 'started',
          },
        },
      },
      port,
    );

    expect(opLinkOpts.prev).toHaveBeenCalledTimes(1);
    expect(opLinkOpts.prev).toHaveBeenNthCalledWith(1, {
      type: 'started',
    });

    messageListeners[0]!(
      {
        trpc: {
          id: 3,
          jsonrpc: undefined,
          result: {
            type: 'data',
            data: 'result.data',
          },
        },
      },
      port,
    );

    expect(opLinkOpts.prev).toHaveBeenCalledTimes(2);
    expect(opLinkOpts.prev).toHaveBeenNthCalledWith(2, {
      type: 'data',
      data: 'result.data',
    });

    expect(messageListeners.length).toBe(1);
    expect(disconnectListeners.length).toBe(1);
  });
});
