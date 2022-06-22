import { createTRPCClient } from '@trpc/client';
import * as trpc from '@trpc/server';
import { z } from 'zod';

import { chromeLink, createChromeHandler } from '../src';

const router = trpc
  .router()
  .query('echo', {
    input: z.object({ payload: z.string() }),
    resolve: ({ input }) => {
      return { payload: input.payload };
    },
  })
  .mutation('echo', {
    input: z.object({ payload: z.string() }),
    resolve: ({ input }) => {
      return { payload: input.payload };
    },
  })
  .subscription('echo', {
    input: z.object({ payload: z.string() }),
    resolve: ({ input }) =>
      new trpc.Subscription<string>((emit) => {
        emit.data(input.payload);
        return () => undefined;
      }),
  });

createChromeHandler({ router });
const trpcClient = createTRPCClient<typeof router>({
  links: [chromeLink({ port: chrome.runtime.connect() })],
});

test('query', () => {
  const res = trpcClient.query('echo', { payload: 'data' });
  console.log(res);
});
