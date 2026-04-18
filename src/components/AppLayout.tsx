import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ListChecks, Target, ClipboardCheck, LogOut, Upload, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/initiatives", icon: ListChecks, label: "Iniciativas" },
  { to: "/checkins", icon: ClipboardCheck, label: "Check-ins" },
  { to: "/relatorios", icon: Sparkles, label: "Relatórios" },
  { to: "/import", icon: Upload, label: "Importar" },
  { to: "/config", icon: Settings, label: "Configurações" },
];

export const AppLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-sm">
        <div className="px-5 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Target className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">GRT</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Command Center</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-primary flex items-center justify-center">
                <Target className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold">GRT</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <nav className="flex border-t border-border overflow-x-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2",
                    isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  )
                }
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
