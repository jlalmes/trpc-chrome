import { resetMocks } from './__setup';

import { TRPCClientError, createTRPCProxyClient } from '@trpc/client';
import { TRPCError, initTRPC } from '@trpc/server';
import { Unsubscribable, observable } from '@trpc/server/observable';
import { z } from 'zod';

import { createChromeHandler } from '../src/adapter';
import { chromeLink } from '../src/link';

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

  throwQuery: t.procedure.input(z.object({ payload: z.string() })).query(({ input }) => {
    throw new Error(input.payload);
  }),
  throwTrpcErrorQuery: t.procedure.input(z.object({ payload: z.string() })).query(({ input }) => {
    throw new TRPCError({ code: 'BAD_REQUEST', message: input.payload });
  }),
  throwMutation: t.procedure.input(z.object({ payload: z.string() })).mutation(({ input }) => {
    throw new Error(input.payload);
  }),
  throwTrpcErrorMutation: t.procedure
    .input(z.object({ payload: z.string() }))
    .mutation(({ input }) => {
      throw new TRPCError({ code: 'BAD_REQUEST', message: input.payload });
    }),

  throwSubscription: t.procedure
    .input(z.object({ payload: z.string() }))
    .subscription(({ input }) =>
      observable<typeof input>((emit) => {
        throw new TRPCError({ message: input.payload, code: 'BAD_REQUEST' });
        emit.next(input);
      }),
    ),
  errorSubscription: t.procedure
    .input(z.object({ payload: z.string() }))
    .subscription(({ input }) =>
      observable<typeof input>((emit) => {
        emit.error(new TRPCError({ message: input.payload, code: 'BAD_REQUEST' }));
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

test('with query', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

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

test('throw error with query', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

  try {
    await trpc.throwQuery.query({ payload: 'i error' });
    fail('has to throw');
  } catch (e) {
    expect(e).toBeInstanceOf(TRPCClientError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const castError = e as TRPCClientError<any>;
    expect(castError.message).toEqual('i error');
  }
});
test('throw trpc error with query', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

  try {
    await trpc.throwTrpcErrorQuery.query({ payload: 'i error' });
    fail('has to throw');
  } catch (e) {
    expect(e).toBeInstanceOf(TRPCClientError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const castError = e as TRPCClientError<any>;
    expect(castError.message).toEqual('i error');
  }
});

test('with mutation', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

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

test('throw error with mutation', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

  try {
    await trpc.throwMutation.mutate({ payload: 'I mutated' });
    fail('has to throw');
  } catch (e) {
    expect(e).toBeInstanceOf(TRPCClientError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const castError = e as TRPCClientError<any>;
    expect(castError.message).toEqual('I mutated');
  }
});

test('throw trpc error with mutation', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

  try {
    await trpc.throwTrpcErrorMutation.mutate({ payload: 'I mutated trpc' });
    fail('has to throw');
  } catch (e) {
    expect(e).toBeInstanceOf(TRPCClientError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const castError = e as TRPCClientError<any>;
    expect(castError.message).toEqual('I mutated trpc');
  }
});

test('with subscription', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

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
  subscription.unsubscribe();
  expect(onDataMock).toHaveBeenCalledTimes(1);
  expect(onCompleteMock).toHaveBeenCalledTimes(1);
  expect(onErrorMock).toHaveBeenCalledTimes(0);
  expect(onStartedMock).toHaveBeenCalledTimes(1);
  expect(onStoppedMock).toHaveBeenCalledTimes(1);
});

test('with error subscription', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

  const onDataMock = jest.fn();
  const onCompleteMock = jest.fn();
  const onErrorMock = jest.fn();
  const onStartedMock = jest.fn();
  const onStoppedMock = jest.fn();

  const subscription = await new Promise<Unsubscribable>((resolve) => {
    const subscription = trpc.errorSubscription.subscribe(
      { payload: 'subscription1' },
      {
        onData: onDataMock,
        onComplete: onCompleteMock,
        onError: (error) => {
          onErrorMock(error);
          resolve(subscription);
        },
        onStarted: onStartedMock,
        onStopped: onStoppedMock,
      },
    );
  });
  expect(onDataMock).toHaveBeenCalledTimes(0);
  expect(onCompleteMock).toHaveBeenCalledTimes(0);
  expect(onErrorMock).toHaveBeenCalledTimes(1);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect(onErrorMock.mock.calls[0][0].message).toEqual('subscription1');
  expect(onStartedMock).toHaveBeenCalledTimes(0);
  expect(onStoppedMock).toHaveBeenCalledTimes(0);
  subscription.unsubscribe();
  expect(onDataMock).toHaveBeenCalledTimes(0);
  expect(onCompleteMock).toHaveBeenCalledTimes(0);
  expect(onErrorMock).toHaveBeenCalledTimes(1);
  expect(onStartedMock).toHaveBeenCalledTimes(0);
  expect(onStoppedMock).toHaveBeenCalledTimes(0);
});

test('with throw subscription', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

  const onDataMock = jest.fn();
  const onCompleteMock = jest.fn();
  const onErrorMock = jest.fn();
  const onStartedMock = jest.fn();
  const onStoppedMock = jest.fn();

  const subscription = await new Promise<Unsubscribable>((resolve) => {
    const subscription = trpc.throwSubscription.subscribe(
      { payload: 'subscription1' },
      {
        onData: onDataMock,
        onComplete: onCompleteMock,
        onError: (error) => {
          onErrorMock(error);
          resolve(subscription);
        },
        onStarted: onStartedMock,
        onStopped: onStoppedMock,
      },
    );
  });

  expect(onDataMock).toHaveBeenCalledTimes(0);
  expect(onCompleteMock).toHaveBeenCalledTimes(0);
  expect(onErrorMock).toHaveBeenCalledTimes(1);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect(onErrorMock.mock.calls[0][0].message).toEqual('subscription1');
  expect(onStartedMock).toHaveBeenCalledTimes(0);
  expect(onStoppedMock).toHaveBeenCalledTimes(0);
  subscription.unsubscribe();
  expect(onDataMock).toHaveBeenCalledTimes(0);
  expect(onCompleteMock).toHaveBeenCalledTimes(0);
  expect(onErrorMock).toHaveBeenCalledTimes(1);
  expect(onStartedMock).toHaveBeenCalledTimes(0);
  expect(onStoppedMock).toHaveBeenCalledTimes(0);
});

test('with nested subscription', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
  });

  const onDataMock = jest.fn();
  const onCompleteMock = jest.fn();
  const onErrorMock = jest.fn();
  const onStartedMock = jest.fn();
  const onStoppedMock = jest.fn();
  const subscription = await new Promise<Unsubscribable>((resolve) => {
    const subscription = trpc.nestedRouter.echoSubscription.subscribe(
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
  subscription.unsubscribe();
  expect(onDataMock).toHaveBeenCalledTimes(1);
  expect(onCompleteMock).toHaveBeenCalledTimes(1);
  expect(onErrorMock).toHaveBeenCalledTimes(0);
  expect(onStartedMock).toHaveBeenCalledTimes(1);
  expect(onStoppedMock).toHaveBeenCalledTimes(1);
});

// with subscription
// with error
// with createcontext
// with output
// with multiport
