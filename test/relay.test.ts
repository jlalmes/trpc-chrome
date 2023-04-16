import { getMockChrome, getMockWindow } from './__setup';

import { relay } from '../src/relay';
import { isTRPCMessage } from '../src/shared/trpcMessage';
import type { TRPCChromeMessage } from '../src/types';

const mockMessage: TRPCChromeMessage = {
  trpc: {
    id: '1',
    result: {
      type: 'data',
      data: {
        payload: 'hello',
      },
    },
  },
};

describe('relay', () => {
  test('validate test data', () => {
    expect(isTRPCMessage(mockMessage)).toBe(true);
  });
  test('relays messages between window to port', () => {
    const chrome = getMockChrome();
    const port = chrome.runtime.connect();
    const handlerPort = chrome.__handlerPort; // only in mock chrome
    const window = getMockWindow();
    const cleanup = relay(window, port);

    expect(port.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(port.onDisconnect.addListener).toHaveBeenCalledTimes(0);
    expect(port.onDisconnect.removeListener).toHaveBeenCalledTimes(0);
    expect(port.onMessage.removeListener).toHaveBeenCalledTimes(0);
    expect(port.postMessage).toHaveBeenCalledTimes(0);
    expect(window.addEventListener).toHaveBeenCalledTimes(1);
    expect(window.removeEventListener).toHaveBeenCalledTimes(0);
    expect(window.postMessage).toHaveBeenCalledTimes(0);

    window.postMessage(mockMessage);

    expect(port.postMessage).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenCalledWith({
      ...mockMessage,
      relayed: true,
    });

    handlerPort.postMessage(mockMessage);

    expect(window.postMessage).toHaveBeenCalledTimes(2);
    expect(window.postMessage).toHaveBeenCalledWith({
      ...mockMessage,
      relayed: true,
    });

    cleanup();

    window.postMessage(mockMessage);
    handlerPort.postMessage(mockMessage);

    expect(port.postMessage).toHaveBeenCalledTimes(1);
  });
});
