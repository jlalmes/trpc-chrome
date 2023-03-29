import type {
  TRPCClientOutgoingMessage,
  TRPCErrorResponse,
  TRPCRequest,
  TRPCResultMessage,
} from '@trpc/server/rpc';

export type TRPCChromeRequest = {
  trpc: TRPCRequest | TRPCClientOutgoingMessage;
};

export type TRPCChromeSuccessResponse = {
  trpc: TRPCResultMessage<any>;
};

export type TRPCChromeErrorResponse = {
  trpc: TRPCErrorResponse;
};

export type TRPCChromeResponse = TRPCChromeSuccessResponse | TRPCChromeErrorResponse;

export type TRPCChromeMessage = TRPCChromeRequest | TRPCChromeResponse;
export type RelayedTRPCMessage = TRPCChromeMessage & { relayed?: true };

export type MinimalWindow = Pick<
  Window,
  'postMessage' | 'addEventListener' | 'removeEventListener'
>;
