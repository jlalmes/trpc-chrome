import { TRPCErrorResponse, TRPCRequest, TRPCResultResponse } from '@trpc/server/rpc';

export type TRPCChromeRequest = {
  trpc: TRPCRequest;
};

export type TRPCChromeResultResponse = {
  trpc: TRPCResultResponse;
};

export type TRPCChromeErrorResponse = {
  trpc: TRPCErrorResponse;
};

export type TRPCChromeResponse = TRPCChromeResultResponse | TRPCChromeErrorResponse;
