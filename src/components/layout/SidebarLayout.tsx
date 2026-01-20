import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Users, 
  FileText, 
  LogOut, 
  CalendarDays,
  FolderOpen,
  Palmtree,
  Home,
  Mail,
  ChevronLeft,
  ChevronRight,
  Menu,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface SidebarLayoutProps {
  children: ReactNode;
}

const SidebarLayout = ({ children }: SidebarLayoutProps) => {
  const { userRole, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = userRole === 'admin';

  const navItems = isAdmin
    ? [
        { icon: Home, label: 'Início', path: '/' },
        { icon: Users, label: 'Gestão de Jornada', path: '/admin' },
        { icon: FileText, label: 'Solicitações', path: '/requests' },
        { icon: Palmtree, label: 'Férias', path: '/vacations' },
        { icon: FolderOpen, label: 'Documentos', path: '/documents' },
        { icon: Settings, label: 'Configurações', path: '/settings' },
      ]
    : [
        { icon: Home, label: 'Início', path: '/' },
        { icon: CalendarDays, label: 'Espelho do Ponto', path: '/timesheet' },
        { icon: FileText, label: 'Minhas Solicitações', path: '/requests' },
        { icon: Users, label: 'Meu Perfil', path: '/profile' },
      ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b border-sidebar-border",
        collapsed && !isMobile && "justify-center"
      )}>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
          <Clock className="h-5 w-5 text-primary-foreground" />
        </div>
        {(!collapsed || isMobile) && (
          <span className="font-bold text-sidebar-foreground text-lg">MINHAS ROTINAS</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && !isMobile && "justify-center px-2",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              )}
              onClick={() => navigate(item.path)}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Collapse toggle - desktop only */}
      {!isMobile && (
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar-background border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar-background">
              <SidebarContent isMobile />
            </SheetContent>
          </Sheet>

          {/* Left spacer for desktop */}
          <div className="hidden md:block" />

          {/* User info and actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Mail className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole === 'admin' ? 'Administrador' : 'Colaborador'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
