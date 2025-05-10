
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from "@/components/ui/toaster"; // For notifications


export const metadata: Metadata = {
  title: 'PCP Tracker',
  description: 'Acompanhe sua produção com facilidade.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${GeistSans.variable} dark`}>
      {/* 
        The `GeistSans.variable` class on the <html> tag makes the CSS variable 
        (e.g., --font-geist-sans) available. The `globals.css` file then uses this 
        variable to set the font-family on the body.
        Added "dark" class to default to dark theme.
      */}
      <body className="antialiased">
        <AppLayout>{children}</AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
