![trpc-browser](assets/trpc-browser-readme.png)

<div align="center">
  <h1>trpc-browser</h1>
  <a href="https://www.npmjs.com/package/trpc-browser"><img src="https://img.shields.io/npm/v/trpc-browser.svg?style=flat&color=brightgreen" target="_blank" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" /></a>
  <a href="https://trpc.io/discord" target="_blank"><img src="https://img.shields.io/badge/chat-discord-blue.svg" /></a>
  <br />
  <hr />
</div>

## **🌐 [tRPC](https://trpc.io/) for everything in the browser**

- Typesafe messaging for extensions
  - between window, content & background scripts
  - ready for Manifest V3.
- Typesafe messaging for windows
  - between window, any other window (eg iframe) or popups

## 📖 Table of contents

- [📦 Installation](#-installation)
- [🧩 Example usage for extensions](#-example-usage-for-extensions)
- [🕸️ Example usage for windows](#️-example-usage-for-windows)
- [📔 Requirements](#-requirements)
- [📝 Example](#-example)
- [🆎 Types](#-types)
- [©️ License](#️-license)
- [🛎️ Contact](#️-contact)

## 📦 Installation

**Install `trpc-browser`.**

```bash
# npm
npm install trpc-browser
# yarn
yarn add trpc-browser
```

## 🧩 Example usage for extensions

**1. Add `createChromeHandler` in your background script.**

```typescript
// background.ts
import { initTRPC } from '@trpc/server';
import { createChromeHandler } from 'trpc-browser/adapter';

const t = initTRPC.create({
  isServer: false,
  allowOutsideOfServer: true,
});

const appRouter = t.router({
  // ...procedures
});

export type AppRouter = typeof appRouter;

createChromeHandler({
  router: appRouter /* 👈 */,
});
```

**2. Add a `chromeLink` to the client in your content script.**

```typescript
// content.ts
import { createTRPCClient } from '@trpc/client';
import { chromeLink } from 'trpc-browser/link';

import type { AppRouter } from './background';

const port = chrome.runtime.connect();
export const chromeClient = createTRPCProxyClient<AppRouter>({
  links: [/* 👉 */ chromeLink({ port })],
});
```

**3. `(extra)` If you have an injected window script, hook it up too!.**

```typescript
// inpage.ts
import { createTRPCClient } from '@trpc/client';
import { windowLink } from 'trpc-browser/link';

import type { AppRouter } from './background';

export const windowClient = createTRPCProxyClient<AppRouter>({
  links: [/* 👉 */ windowLink({ window })],
});
```

```typescript
// content.ts
import { relay } from 'trpc-browser/relay';

const port = chrome.runtime.connect();
relay(port, window);
```

## 🕸️ Example usage for windows

**1. Add `createWindowHandler` in your main window.**

```typescript
// main.ts
import { initTRPC } from '@trpc/server';
import { createWindowHandler } from 'trpc-browser/adapter';

const t = initTRPC.create({
  isServer: false,
  allowOutsideOfServer: true,
});

const appRouter = t.router({
  // ...procedures
});

export type AppRouter = typeof appRouter;

createWindowHandler({
  router: appRouter /* 👈 */,
  window: window /* 👈 */,
});
```

**2. Add a `windowLink` or `popupLink` to the client**

```typescript
import { createTRPCClient } from '@trpc/client';
import { popupLink, windowLink } from 'trpc-browser/link';

import type { AppRouter } from './main';

/** iframe */
const iframeEl = document.querySelector('iframe');
export const iframeClient = createTRPCProxyClient<AppRouter>({
  links: [/* 👉 */ windowLink({ window: iframeEl.contentWindow })],
});

/** popup */
export const popupClient = createTRPCProxyClient<AppRouter>({
  links: [
    /* 👉 */ popupLink({
      listenWindow: window,
      createPopup: () => {
        const w = window.open('/example/popup', 'popup', 'width=680,height=520');
        if (!w) {
          throw new Error('Could not open popup');
        }
        return w;
      },
    }),
  ],
});
```

## 📔 Requirements

Peer dependencies:

- [`tRPC`](https://github.com/trpc/trpc) Server v10 (`@trpc/server`) must be installed.
- [`tRPC`](https://github.com/trpc/trpc) Client v10 (`@trpc/client`) must be installed.

## 📝 Example

Please see [an extension example here](examples/with-plasmo).
You can also find a [window example here](examples/on-web).

_For advanced use-cases, please find examples in our [complete test suite](test)._

## 🆎 Types

#### ChromeLinkOptions

Please see [full typings here](src/link/chrome.ts).

| Property | Type                  | Description                                                      | Required |
| -------- | --------------------- | ---------------------------------------------------------------- | -------- |
| `port`   | `chrome.runtime.Port` | An open web extension port between content & background scripts. | `true`   |

### WindowLinkOptions

Please see [full typings here](src/link/window.ts).

| Property | Type     | Description                                     | Required |
| -------- | -------- | ----------------------------------------------- | -------- |
| `window` | `Window` | A window object which is listened to by a relay | `true`   |

### PopupLinkOptions

Please see [full typings here](src/link/popup.ts).

| Property       | Type       | Description                                     | Required |
| -------------- | ---------- | ----------------------------------------------- | -------- |
| `listenWindow` | `Window`   | A window object which is listened to by a relay | `true`   |
| `createPopup`  | `Function` | A function that returns a window object.        | `true`   |

### CreateChromeHandlerOptions

Please see [full typings here](src/adapter/chrome.ts).

| Property        | Type       | Description                                            | Required |
| --------------- | ---------- | ------------------------------------------------------ | -------- |
| `router`        | `Router`   | Your application tRPC router.                          | `true`   |
| `createContext` | `Function` | Passes contextual (`ctx`) data to procedure resolvers. | `false`  |
| `onError`       | `Function` | Called if error occurs inside handler.                 | `false`  |
| `chrome`        | `Object`   | Chrome API object. (default: `global.chrome`)          | `false`  |

### CreateWindowHandlerOptions

Please see [full typings here](src/adapter/window.ts).

| Property        | Type       | Description                                                                                        | Required |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------- | -------- |
| `router`        | `Router`   | Your application tRPC router.                                                                      | `true`   |
| `createContext` | `Function` | Passes contextual (`ctx`) data to procedure resolvers.                                             | `false`  |
| `onError`       | `Function` | Called if error occurs inside handler.                                                             | `false`  |
| `window`        | `Window`   | Window object to subscribe to                                                                      | `true`   |
| `postWindow`    | `Window`   | Window object to post messages to. (default: `MessageEvent.source` with fallback to `opts.window`) | `false`  |

---

## ©️ License

Distributed under the MIT License. See LICENSE for more information.

## 🛎️ Contact

Janek Rahrt - Follow me on Twitter [@janek26](https://twitter.com/janek26) 💜
James Berry - Follow me on Twitter [@jlalmes](https://twitter.com/jlalmes) 💙
