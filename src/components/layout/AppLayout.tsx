
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Target,
  Settings,
  UserCircle,
  Menu as MenuIcon,
  LogOut,
  BarChart3, // For "Desempenho"
  X, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
// import { Logo } from '@/components/icons/Logo'; // Logo not used in new design
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/skus', label: 'SKUs', icon: Package },
  { href: '/production-orders', label: 'Produção', icon: ClipboardList },
  { href: '/demand-planning', label: 'Demanda', icon: Target },
  { href: '/performance', label: 'Desempenho', icon: BarChart3 }, 
];

// Mock user data as per image
const MOCKED_USER = {
  name: "williansandro6",
  avatarUrl: "https://avatar.vercel.sh/williansandro6.png", // data-ai-hint="user avatar"
};

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Voltar para o Painel de Controle">
            {/* <Logo className="h-7 w-7 text-primary" /> // Logo removed based on image */}
            <span className="text-xl font-bold text-foreground">PCP Tracker</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop Navigation & User Info */}
            <nav className="hidden md:flex items-center space-x-1">
              <span className="text-sm text-muted-foreground mr-3">Olá, {MOCKED_USER.name}</span>
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  asChild
                  className={cn(
                    "px-3 py-2 text-sm font-medium",
                    (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              ))}
              <Button variant="ghost" asChild className="text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground">
                <Link href="/logout"> {/* Assuming a /logout route */}
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Link>
              </Button>
            </nav>
            
            {/* Mobile Navigation Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm p-0 bg-card border-r border-border"> {/* Changed to bg-card */}
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-border p-4">
                     <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                        <span className="text-lg font-bold text-foreground">PCP Tracker</span> {/* Text foreground for title */}
                    </Link>
                    <SheetClose asChild>
                         <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground"> {/* Ensure visibility */}
                            <X className="h-6 w-6" /> 
                            <span className="sr-only">Fechar menu</span>
                        </Button>
                    </SheetClose>
                  </div>
                  <nav className="flex-grow p-4 space-y-2">
                    <div className='mb-4 p-3 rounded-md bg-background border border-border'> {/* bg-background and border for user info */}
                        <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={MOCKED_USER.avatarUrl} alt="Avatar do usuário" data-ai-hint="user avatar" />
                                <AvatarFallback>
                                    {MOCKED_USER.name ? MOCKED_USER.name.slice(0,2).toUpperCase() : <UserCircle className="h-5 w-5" />}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-semibold leading-none text-foreground">{MOCKED_USER.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {MOCKED_USER.name}@example.com
                                </p>
                            </div>
                        </div>
                    </div>
                    {navItems.map((item) => (
                      <Button
                        key={item.href}
                        variant={ (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) ? "default" : "ghost" } // "default" for active
                        asChild
                        className={cn(
                          "w-full justify-start text-base py-3", // increased py
                           (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
                            ? "font-semibold bg-primary text-primary-foreground hover:bg-primary/90" // active style
                            : "text-foreground hover:bg-accent/50 hover:text-accent-foreground" // inactive style, ensure text-foreground for visibility
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link href={item.href}>
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.label}
                        </Link>
                      </Button>
                    ))}
                     <div className="border-t border-border pt-4 mt-auto"> {/* mt-auto to push to bottom */}
                        <Button
                            variant="ghost"
                            asChild
                            className="w-full justify-start text-base text-foreground hover:bg-accent/50 hover:text-accent-foreground" // text-foreground
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Link href="/settings">
                              <Settings className="mr-3 h-5 w-5" />
                              Configurações
                            </Link>
                          </Button>
                        <Button
                            variant="ghost"
                            asChild
                            className="w-full justify-start text-base text-destructive hover:bg-destructive/10 hover:text-destructive" // text-destructive
                            onClick={() => setIsMobileMenuOpen(false)} // Assuming logout action
                          >
                            <Link href="/logout">
                              <LogOut className="mr-3 h-5 w-5" />
                              Sair
                            </Link>
                          </Button>
                     </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6 md:py-8 lg:py-10">
        {children}
      </main>
       <footer className="py-6 md:px-8 md:py-0 border-t border-border bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-20 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} PCP Tracker. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

