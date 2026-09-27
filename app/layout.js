import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { getTheme } from '../lib/server/theme';
import CookieConsent from '../components/CookieConsent';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Vireon Labs',
  description: 'Full stack development, AI consulting, and cloud automation for growing businesses.',
};

export default async function RootLayout({ children }) {
  // Reads the theme directly (same process, no HTTP hop) so the primary/
  // secondary colors set in /admin/theme apply to every page on first
  // render, with no flash of the default colors.
  const theme = await getTheme();

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      style={{ '--color-primary': theme.primaryColor, '--color-secondary': theme.secondaryColor }}
    >
      <body className="font-body antialiased">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
