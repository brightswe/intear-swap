
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from "next/font/google";
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta",
})

export const metadata: Metadata = {
  title: 'dex App',
  description: 'Lightning-fast swaps on NEAR Protocol',
  icons: {
    icon: '/logo.svg',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  )
}
