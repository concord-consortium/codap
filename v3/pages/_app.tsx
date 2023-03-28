import '../src/globals.scss' // import global css here
import "react-data-grid/lib/styles.css"
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
