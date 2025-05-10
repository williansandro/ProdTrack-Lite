
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
import { Logo } from '@/components/icons/Logo';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Painel de Controle', icon: LayoutDashboard },
  { href: '/skus', label: 'SKUs', icon: Package },
  { href: '/production-orders', label: 'Pedidos de Produção', icon: ClipboardList },
  { href: '/demand-planning', label: 'Planejamento de Demanda', icon: Target },
];

function UserNav() {
  const isLoggedIn = true;
  const userName = "Nome do Usuário";
  const userEmail = "usuario@exemplo.com";

  if (!isLoggedIn) {
    return (
      <Button asChild variant="outline">
        <Link href="/login">Entrar</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://picsum.photos/40/40" alt="Avatar do usuário" data-ai-hint="user avatar" />
            <AvatarFallback>
              {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase() : <UserCircle className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Voltar para o Painel de Controle">
            <Logo className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold text-foreground">ProdTrack Lite</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
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
          </nav>

          <div className="flex items-center gap-2">
            <UserNav />
            {/* Mobile Navigation Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm p-0">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b p-4">
                     <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                        <Logo className="h-7 w-7 text-primary" />
                        <span className="text-lg font-semibold">ProdTrack Lite</span>
                    </Link>
                    <SheetClose asChild>
                         <Button variant="ghost" size="icon" className="md:hidden">
                            <MenuIcon className="h-6 w-6 rotate-90" /> {/* Or X icon */}
                            <span className="sr-only">Fechar menu</span>
                        </Button>
                    </SheetClose>
                  </div>
                  <nav className="flex-grow p-4 space-y-2">
                    {navItems.map((item) => (
                      <Button
                        key={item.href}
                        variant={ (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) ? "secondary" : "ghost" }
                        asChild
                        className={cn(
                          "w-full justify-start text-base",
                           (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
                            ? "font-semibold"
                            : "text-muted-foreground"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link href={item.href}>
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.label}
                        </Link>
                      </Button>
                    ))}
                     <div className="border-t pt-4 mt-4">
                        <Button
                            variant="ghost"
                            asChild
                            className="w-full justify-start text-base text-muted-foreground"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Link href="#">
                              <Settings className="mr-3 h-5 w-5" />
                              Configurações
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
      <main className="flex-1 container py-6 md:py-8 lg:py-10 bg-secondary/30">
        {children}
      </main>
       <footer className="py-6 md:px-8 md:py-0 border-t bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-20 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} ProdTrack Lite. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

    