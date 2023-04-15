import type { AppProps } from 'next/app';

import '../styles/globals.css';
import '../trpcListener';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
