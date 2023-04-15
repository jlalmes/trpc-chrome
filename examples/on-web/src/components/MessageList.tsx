import React, { FC, useEffect } from 'react';
import { create } from 'zustand';

export type RequestResponseData = {
  action: 'received' | 'sent';
  type: 'request' | 'response';
  name: string;
  payload: string;
};

export const useMessagesStore = create<{
  data: Array<RequestResponseData>;
}>(() => ({
  data: [],
}));

const MessageList: FC = () => {
  const messages = useMessagesStore((state) => state.data);

  // render only client-side without warning
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="rounded-md shadow max-h-full w-full overflow-y-auto">
      <div className="grid grid-cols-4 font-bold text-lg mb-4">
        <span>Action</span>
        <span>Type</span>
        <span>Name</span>
        <span>Payload</span>
      </div>
      <ul>
        {messages.map((message, index) => (
          <li key={index} className="mb-2">
            <div
              className={`${
                message.action === 'received'
                  ? 'bg-blue-400 dark:bg-blue-700'
                  : 'bg-green-400 dark:bg-green-700'
              } p-2 rounded-md grid grid-cols-4 gap-4`}
            >
              <span>{message.action}</span>
              <span>{message.type}</span>
              <span>{message.name}</span>
              <span>{message.payload}</span>
            </div>
          </li>
        ))}
        {messages.length === 0 && <li className="text-gray-400 text-center">No messages yet</li>}
      </ul>
    </div>
  );
};

export default MessageList;
