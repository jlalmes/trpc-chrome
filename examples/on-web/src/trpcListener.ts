import { initTRPC } from '@trpc/server';
import { z } from 'zod';

import { createWindowHandler } from '../../../adapter/window';
import { useMessagesStore } from './components/MessageList';

const t = initTRPC.create({
  isServer: false,
  allowOutsideOfServer: true,
});

const appRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string() }))
    .output(
      z.object({
        message: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      useMessagesStore.setState((state) => {
        return {
          data: [
            ...state.data,
            {
              action: 'received',
              name: 'hello',
              type: 'request',
              payload: JSON.stringify(input),
            },
          ],
        };
      });
      // wait 500ms
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = {
        message: `Hello ${input.name}!`,
      };
      useMessagesStore.setState((state) => {
        return {
          data: [
            ...state.data,
            {
              action: 'sent',
              name: 'hello',
              type: 'response',
              payload: JSON.stringify(response),
            },
          ],
        };
      });
      return response;
    }),
});

export type AppRouter = typeof appRouter;

if (typeof window !== 'undefined') {
  createWindowHandler({ router: appRouter, window: window, postOrigin: '*' });
}
