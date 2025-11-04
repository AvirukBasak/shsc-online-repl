import React from "react";
import type { AppProps } from "next/app";
import "@/pages/styles/globals.css"

export default function App({ Component, pageProps }: AppProps): React.ReactElement {
  return <Component {...pageProps} />;
}
