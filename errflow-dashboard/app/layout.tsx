import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL('https://errflow.dev'),
  title: {
    default: "errflow - Lightweight Error Monitoring for Node.js",
    template: "%s | errflow"
  },
  description: "Lightweight, zero-dependency runtime error monitoring for Node.js applications. Capture exceptions, enrich with context, and ship to your dashboard.",
  keywords: [
    "error monitoring",
    "error tracking",
    "runtime errors",
    "Node.js",
    "TypeScript",
    "exception handling",
    "crash reporting",
    "observability",
    "logging",
    "APM",
    "errflow"
  ],
  authors: [{ name: "errflow Team" }],
  creator: "errflow",
  publisher: "errflow",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://errflow.dev",
    title: "errflow - Lightweight Error Monitoring for Node.js",
    description: "Lightweight, zero-dependency runtime error monitoring for Node.js applications. Capture exceptions, enrich with context, and ship to your dashboard.",
    siteName: "errflow",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "errflow - Lightweight Error Monitoring"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "errflow - Lightweight Error Monitoring for Node.js",
    description: "Lightweight, zero-dependency runtime error monitoring for Node.js applications. Capture exceptions, enrich with context, and ship to your dashboard.",
    images: ["/og-image.png"],
    creator: "@errflow_dev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://errflow.dev",
  },
  category: "technology",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="theme-color" content="#EA4C48" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
