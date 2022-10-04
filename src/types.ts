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
