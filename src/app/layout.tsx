
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from "@/components/ui/toaster"; // For notifications


export const metadata: Metadata = {
  title: 'ProdTrack Lite',
  description: 'Acompanhe sua produção com facilidade.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={GeistSans.variable}>
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
