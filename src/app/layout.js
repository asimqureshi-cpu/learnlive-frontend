import './globals.css'

export const metadata = {
  title: 'LearnLive — AI-Facilitated Discussion Platform',
  description: 'Structured group learning with intelligent facilitation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
