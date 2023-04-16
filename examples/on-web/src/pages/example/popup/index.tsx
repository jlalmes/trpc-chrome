import { useEffect, useRef, useState } from 'react';

import RequestResponseList, { useMessagesStore } from '../../../components/MessageList';
import { getTrpcClientPopup } from '../../../trpcClient';

export default function Popup() {
  const tRef = useRef<ReturnType<typeof getTrpcClientPopup>>();

  return (
    <main className="flex min-h-screen flex-col items-center p-24 gap-24">
      <h1 className="text-6xl font-bold">Welcome to the popup example</h1>

      {/* 1 big button "send request" */}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={async () => {
          if (!tRef.current) {
            tRef.current = getTrpcClientPopup();
          }
          const t = tRef.current;

          useMessagesStore.setState((msgs) => {
            return {
              data: [
                ...msgs.data,
                {
                  action: 'sent',
                  name: 'hello',
                  payload: JSON.stringify({ name: 'Janek' }),
                  type: 'request',
                },
              ],
            };
          });
          const res = await t.hello.mutate({ name: 'Janek' });
          useMessagesStore.setState((msgs) => {
            return {
              data: [
                ...msgs.data,
                {
                  action: 'received',
                  name: 'hello',
                  payload: JSON.stringify(res),
                  type: 'response',
                },
              ],
            };
          });
          console.log(res);
        }}
      >
        send request
      </button>

      <RequestResponseList />
    </main>
  );
}
