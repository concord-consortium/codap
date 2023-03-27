import Head from 'next/head'
import { CodapV3Root } from '../src'
// import Image from 'next/image'
// import { Inter } from 'next/font/google'
// import styles from '@/styles/Home.module.css'

// @TODO: Import Lato using Next's optimized font bundling
// const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <title>CODAP V3</title>
        <meta name="description" content="Starter Projects" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/* <main className="main">
        
      </main> */}
      <CodapV3Root />
    </>
  )
}
