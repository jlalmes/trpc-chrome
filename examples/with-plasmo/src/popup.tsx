import { createTRPCProxyClient } from '@trpc/client';
import { useRef, useState } from 'react';
import { chromeLink } from 'trpc-chrome/link';

import type { AppRouter } from './background';

const port = chrome.runtime.connect();
const trpc = createTRPCProxyClient<AppRouter>({
  links: [chromeLink({ port })],
});

function Popup() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onOpenNewTab = async () => {
    setErrorMessage(null);
    const url = inputRef.current!.value;
    try {
      await trpc.openNewTab.mutate({ url });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        gap: 8,
      }}
    >
      <h2>Extension using tRPC & Plasmo</h2>
      <input ref={inputRef} placeholder={'Enter a URL'} />
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      <button onClick={onOpenNewTab}>Open new tab</button>
    </div>
  );
}

export default Popup;
