import { useRef } from 'react';

import RequestResponseList, { useMessagesStore } from '../../../components/MessageList';
import { getTrpcClientIframe } from '../../../trpcClient';

const iframeUrl = `${process.env.NEXT_PUBLIC_REMOTE_ORIGIN || ''}/example/iframe/embedded`;

export default function Popup() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <main className="flex min-h-screen flex-col items-center p-24 gap-24">
      <div className="flex flex-col space-y-4">
        <h1 className="text-6xl font-bold">Welcome to the iframe example</h1>
        <code className="text-gray-500 text-center">{iframeUrl}</code>
      </div>

      {/* 1 big button "send request" */}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={async () => {
          if (!iframeRef.current?.contentWindow) throw new Error('iframe not loaded yet');
          const t = getTrpcClientIframe(iframeRef.current.contentWindow);

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

      <div className="flex space-x-4">
        <RequestResponseList />

        {/* styled iframe container */}
        <div className="shadow-md rounded-md p-4 h-64 w-full overflow-y-auto border-2 border-gray-200">
          <iframe ref={iframeRef} src={iframeUrl} className="w-full h-full" />
        </div>
      </div>
    </main>
  );
}
