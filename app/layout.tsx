import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Pickle-Klaw — AI Pickleball Receptionist',
  description: 'AI-powered receptionist for pickleball clubs. Handles bookings, memberships, waivers, and questions 24/7.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Pickle-Klaw' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
