import './globals.css'

export const metadata = {
  title: 'LearnLive — AI-Facilitated Discussion Platform',
  description: 'Structured group learning with intelligent facilitation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
