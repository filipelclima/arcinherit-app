import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Heirloom — Onchain Inheritance Vault',
  description: 'Decentralized inheritance vault for ERC-20 tokens on Arc Network. Non-custodial, immutable, timelock-based.',
}

// Runs before hydration so the right theme class is already on <html> for the very first paint --
// otherwise a page saved (or system-set) to dark mode would flash light for an instant while React
// boots. Kept tiny and defensive (try/catch) since it runs outside React entirely.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('heirloom-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script below adds a class to <html> before React hydrates, which
    // would otherwise make React complain about a class-attribute mismatch on this exact element.
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
