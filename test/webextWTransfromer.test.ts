import { resetMocks } from './__setup';

import { createTRPCProxyClient } from '@trpc/client';
import { initTRPC } from '@trpc/server';
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

  echoTransformerQuery: t.procedure
    .input(z.object({ payload: z.date() }))
    .query(({ input }) => input),

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
