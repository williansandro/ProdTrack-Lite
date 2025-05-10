
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from "@/components/ui/toaster"; // For notifications

// Geist Mono is not explicitly used in the example, but kept for consistency if needed later.
// import { GeistMono } from 'geist/font/mono';
// const geistMono = GeistMono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'ProdTrack Lite',
  description: 'Track your production with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={GeistSans.variable}>
      {/* 
        The `GeistSans.variable` class on the <html> tag makes the CSS variable 
        (e.g., --font-geist-sans) available. The `globals.css` file then uses this 
        variable to set the font-family on the body.
      */}
      <body className="antialiased">
        <AppLayout>{children}</AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
