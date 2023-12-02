import { resetMocks } from './__setup';

import { TRPCClientError, createTRPCProxyClient } from '@trpc/client';
import { TRPCError, initTRPC } from '@trpc/server';
import { Unsubscribable, observable } from '@trpc/server/observable';
import superjson from 'superjson';
import { z } from 'zod';

import { createChromeHandler } from '../src/adapter';
import { chromeLink } from '../src/link';

afterEach(() => {
  resetMocks();
});

const t = initTRPC.create({ transformer: superjson });

const appRouter = t.router({
  echoQuery: t.procedure
    .input(z.object({ payload: z.string(), date: z.date() }))
    .query(({ input }) => input),
  echoMutation: t.procedure
    .input(z.object({ payload: z.string(), date: z.date() }))
    .mutation(({ input }) => input),
  echoSubscription: t.procedure
    .input(z.object({ payload: z.string(), date: z.date() }))
    .subscription(({ input }) =>
      observable<typeof input>((emit) => {
        emit.next(input);
      }),
    ),

  throwQuery: t.procedure.input(z.object({ payload: z.string() })).query(({ input }) => {
    throw new Error(input.payload);
    return input;
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
    echoQuery: t.procedure
      .input(z.object({ payload: z.string(), date: z.date() }))
      .query(({ input }) => input),
    echoMutation: t.procedure
      .input(z.object({ payload: z.string(), date: z.date() }))
      .mutation(({ input }) => input),
    echoSubscription: t.procedure
      .input(z.object({ payload: z.string(), date: z.date() }))
      .subscription(({ input }) =>
        observable((emit) => {
          emit.next(input);
        }),
      ),

    echoTransformerQuery: t.procedure
      .input(z.object({ payload: z.date() }))
      .query(({ input }) => input),
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
    transformer: superjson,
  });

  // 2023-11-17 08:00:00 utc
  const date1 = new Date(1700208000000);
  const data1 = await trpc.echoQuery.query({ payload: 'query1', date: date1 });
  expect(data1).toEqual({ payload: 'query1', date: date1 });

  // 2023-11-20 08:00:00 utc
  const date2 = new Date(1700467200000);
  const data2 = await trpc.nestedRouter.echoQuery.query({ payload: 'query2', date: date2 });
  expect(data2).toEqual({ payload: 'query2', date: date2 });

  // 2022-11-20 08:00:00 utc
  const date3 = new Date(1668931200000);
  // 2021-11-20 08:00:00 utc
  const date4 = new Date(1637395200000);
  const [data3, data4] = await Promise.all([
    trpc.echoQuery.query({ payload: 'query3', date: date3 }),
    trpc.echoQuery.query({ payload: 'query4', date: date4 }),
  ]);
  expect(data3).toEqual({ payload: 'query3', date: date3 });
  expect(data4).toEqual({ payload: 'query4', date: date4 });
});

test('throw error with query', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
    transformer: superjson,
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
    transformer: superjson,
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
    transformer: superjson,
  });

  // 2023-11-17 08:00:00 utc
  const date1 = new Date(1700208000000);
  const data1 = await trpc.echoMutation.mutate({ payload: 'mutation1', date: date1 });
  expect(data1).toEqual({ payload: 'mutation1', date: date1 });

  // 2023-11-20 08:00:00 utc
  const date2 = new Date(1700467200000);
  const data2 = await trpc.nestedRouter.echoMutation.mutate({ payload: 'mutation2', date: date2 });
  expect(data2).toEqual({ payload: 'mutation2', date: date2 });

  // 2022-11-20 08:00:00 utc
  const date3 = new Date(1668931200000);
  // 2021-11-20 08:00:00 utc
  const date4 = new Date(1637395200000);
  const [data3, data4] = await Promise.all([
    trpc.echoMutation.mutate({ payload: 'mutation3', date: date3 }),
    trpc.echoMutation.mutate({ payload: 'mutation4', date: date4 }),
  ]);
  expect(data3).toEqual({ payload: 'mutation3', date: date3 });
  expect(data4).toEqual({ payload: 'mutation4', date: date4 });
});

test('throw error with mutation', async () => {
  // background
  createChromeHandler({ router: appRouter });
  expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);

  // content
  const port = chrome.runtime.connect();
  const trpc = createTRPCProxyClient<typeof appRouter>({
    links: [chromeLink({ port })],
    transformer: superjson,
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
    transformer: superjson,
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
    transformer: superjson,
  });

  const onDataMock = jest.fn();
  const onCompleteMock = jest.fn();
  const onErrorMock = jest.fn();
  const onStartedMock = jest.fn();
  const onStoppedMock = jest.fn();

  // 2023-11-17 08:00:00 utc
  const date1 = new Date(1700208000000);
  const subscription = await new Promise<Unsubscribable>((resolve) => {
    const subscription = trpc.echoSubscription.subscribe(
      { payload: 'subscription1', date: date1 },
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
  expect(onDataMock).toHaveBeenNthCalledWith(1, { payload: 'subscription1', date: date1 });
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
    transformer: superjson,
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
    transformer: superjson,
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
    transformer: superjson,
  });

  const onDataMock = jest.fn();
  const onCompleteMock = jest.fn();
  const onErrorMock = jest.fn();
  const onStartedMock = jest.fn();
  const onStoppedMock = jest.fn();

  // 2023-11-20 08:00:00 utc
  const date1 = new Date(1700467200000);
  const subscription = await new Promise<Unsubscribable>((resolve) => {
    const subscription = trpc.nestedRouter.echoSubscription.subscribe(
      { payload: 'subscription1', date: date1 },
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
  expect(onDataMock).toHaveBeenNthCalledWith(1, { payload: 'subscription1', date: date1 });
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
