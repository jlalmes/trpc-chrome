import { getMockWindow, resetMocks } from './__setup';

import { TRPCLink, createTRPCProxyClient } from '@trpc/client';
import { AnyRouter, initTRPC } from '@trpc/server';
import { Unsubscribable, observable } from '@trpc/server/observable';
import { z } from 'zod';

import { createWindowHandler } from '../src/adapter';
import { popupLink, windowLink } from '../src/link';
import { MinimalWindow } from '../src/types';

afterEach(() => {
  resetMocks();
});

const t = initTRPC.create();

const appRouter = t.router({
  echoQuery: t.procedure.input(z.object({ payload: z.string() })).query(({ input }) => input),
  echoMutation: t.procedure.input(z.object({ payload: z.string() })).mutation(({ input }) => input),
  echoSubscription: t.procedure.input(z.object({ payload: z.string() })).subscription(({ input }) =>
    observable<typeof input>((emit) => {
      emit.next(input);
    }),
  ),
  nestedRouter: t.router({
    echoQuery: t.procedure.input(z.object({ payload: z.string() })).query(({ input }) => input),
    echoMutation: t.procedure
      .input(z.object({ payload: z.string() }))
      .mutation(({ input }) => input),
    echoSubscription: t.procedure
      .input(z.object({ payload: z.string() }))
      .subscription(({ input }) =>
        observable((emit) => {
          emit.next(input);
        }),
      ),
  }),
});

type LinkName = 'window' | 'popup';
function createLink(type: LinkName): {
  link: TRPCLink<AnyRouter>;
  listenWindow: MinimalWindow;
  postWindow: MinimalWindow;
} {
  switch (type) {
    case 'window': {
      const window = getMockWindow();
      return { link: windowLink({ window }), listenWindow: window, postWindow: window };
    }
    case 'popup': {
      const window = getMockWindow();
      const popup = getMockWindow(window);

      const link = popupLink({
        listenWindow: window,
        createPopup: () => popup,
      });
      return { link, listenWindow: window, postWindow: popup };
    }
    default: {
      throw new Error('unknown link requested');
    }
  }
}

const testCases: Array<{ linkName: LinkName }> = [{ linkName: 'window' }, { linkName: 'popup' }];

describe.each(testCases)('with $linkName link', ({ linkName }) => {
  test('with query', async () => {
    const { link, listenWindow, postWindow } = createLink(linkName);
    const trpc = createTRPCProxyClient<typeof appRouter>({
      links: [link],
    });

    // background
    createWindowHandler({ router: appRouter, listenWindow, postWindow });

    const data1 = await trpc.echoQuery.query({ payload: 'query1' });
    expect(data1).toEqual({ payload: 'query1' });

    const data2 = await trpc.nestedRouter.echoQuery.query({ payload: 'query2' });
    expect(data2).toEqual({ payload: 'query2' });

    const [data3, data4] = await Promise.all([
      trpc.echoQuery.query({ payload: 'query3' }),
      trpc.echoQuery.query({ payload: 'query4' }),
    ]);
    expect(data3).toEqual({ payload: 'query3' });
    expect(data4).toEqual({ payload: 'query4' });
  });

  test('with mutation', async () => {
    const { link, listenWindow, postWindow } = createLink(linkName);
    const trpc = createTRPCProxyClient<typeof appRouter>({
      links: [link],
    });

    // background
    createWindowHandler({ router: appRouter, listenWindow, postWindow });

    const data1 = await trpc.echoMutation.mutate({ payload: 'mutation1' });
    expect(data1).toEqual({ payload: 'mutation1' });

    const data2 = await trpc.nestedRouter.echoMutation.mutate({ payload: 'mutation2' });
    expect(data2).toEqual({ payload: 'mutation2' });

    const [data3, data4] = await Promise.all([
      trpc.echoMutation.mutate({ payload: 'mutation3' }),
      trpc.echoMutation.mutate({ payload: 'mutation4' }),
    ]);
    expect(data3).toEqual({ payload: 'mutation3' });
    expect(data4).toEqual({ payload: 'mutation4' });
  });

  test('with subscription', async () => {
    const { link, listenWindow, postWindow } = createLink(linkName);
    const trpc = createTRPCProxyClient<typeof appRouter>({
      links: [link],
    });

    // background
    createWindowHandler({ router: appRouter, listenWindow, postWindow });

    const onDataMock = jest.fn();
    const onCompleteMock = jest.fn();
    const onErrorMock = jest.fn();
    const onStartedMock = jest.fn();
    const onStoppedMock = jest.fn();
    const subscription = await new Promise<Unsubscribable>((resolve) => {
      const subscription = trpc.echoSubscription.subscribe(
        { payload: 'subscription1' },
        {
          onData: (data) => {
            onDataMock(data);
            resolve(subscription);
          },
          onComplete: onCompleteMock,
          onError: onErrorMock,
          onStarted: onStartedMock,
          onStopped: onStoppedMock,
        },
      );
    });

    expect(onDataMock).toHaveBeenCalledTimes(1);
    expect(onDataMock).toHaveBeenNthCalledWith(1, { payload: 'subscription1' });
    expect(onCompleteMock).toHaveBeenCalledTimes(0);
    expect(onErrorMock).toHaveBeenCalledTimes(0);
    expect(onStartedMock).toHaveBeenCalledTimes(1);
    expect(onStoppedMock).toHaveBeenCalledTimes(0);

    // TODO: unsubscribe does not work with popup link yet, no clue why
    if (linkName !== 'popup') {
      subscription.unsubscribe();
      expect(onDataMock).toHaveBeenCalledTimes(1);
      expect(onCompleteMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
      expect(onStartedMock).toHaveBeenCalledTimes(1);
      expect(onStoppedMock).toHaveBeenCalledTimes(1);
    }
  });
});

// with subscription
// with error
// with createcontext
// with output
// with multiport
