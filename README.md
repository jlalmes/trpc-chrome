<p align="left">
  <a href="/">
    <img src="./assets/trpc-chrome.svg" alt="tRPC-Chrome" height="100"/>
  </a>
</p>

# trpc-chrome 🚧

### **[Chrome extension](https://developer.chrome.com/docs/extensions/mv3/) adapter for [tRPC](https://trpc.io/)** 🧩

- Easy communication for web extensions.
- Typesafe messaging between content & background scripts.
- Ready for Manifest V3.

### Roadmap 🚘

- Reconnect on background script reload. (maybe?)
- Add example with client(content) & handler(background).
- Add example with vice-versa handler(content) & client(background).

## Usage

**1. Install `trpc-chrome`.**

```bash
# npm
npm install trpc-chrome
# yarn
yarn add trpc-chrome
```

**2. Add a `chromeLink` to the client in your content script.**

```typescript
// content.ts
import { createTRPCClient } from '@trpc/client';
import { chromeLink } from 'trpc-chrome';

import type { AppRouter } from './appRouter';

const port = chrome.runtime.connect(chrome.runtime.id);

export const chromeClient = createTRPCClient<AppRouter>({
  links: [/* 👉 */ chromeLink({ port })],
});
```

**3. Add `createChromeHandler` in your background script.**

```typescript
// background.ts
import { createChromeHandler } from 'trpc-chrome';

import { appRouter } from './appRouter';

createChromeHandler({ router: appRouter /* 👈 */ });
```

## Requirements

Peer dependencies:

- [`tRPC`](https://github.com/trpc/trpc) Server v9 (`@trpc/server@^9.23.0`) must be installed.
- [`tRPC`](https://github.com/trpc/trpc) Client v9 (`@trpc/client@^9.23.0`) must be installed.

## Example

Please see [full example here](example).

_For advanced use-cases, please find examples in our [complete test suite](test)._

## Types

#### ChromeLinkOptions

Please see [full typings here](src/link.ts).

| Property | Type                  | Description                                                      | Required |
| -------- | --------------------- | ---------------------------------------------------------------- | -------- |
| `port`   | `chrome.runtime.Port` | An open web extension port between content & background scripts. | `true`   |

#### CreateChromeHandlerOptions

Please see [full typings here](src/handler.ts).

| Property        | Type       | Description                                            | Required |
| --------------- | ---------- | ------------------------------------------------------ | -------- |
| `router`        | `Router`   | Your application tRPC router.                          | `true`   |
| `createContext` | `Function` | Passes contextual (`ctx`) data to procedure resolvers. | `false`  |
| `onError`       | `Function` | Called if error occurs inside handler.                 | `false`  |
| `teardown`      | `Function` | Called after each request is completed.                | `false`  |

---

## License

Distributed under the MIT License. See LICENSE for more information.

## Contact

James Berry - Follow me on Twitter [@jlalmes](https://twitter.com/jlalmes) 💚
