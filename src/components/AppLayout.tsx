import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ListChecks, ClipboardCheck, LogOut, Upload, Sparkles, Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat", icon: MessageSquare, label: "Atualizar" },
  { to: "/initiatives", icon: ListChecks, label: "Iniciativas" },
  { to: "/checkins", icon: ClipboardCheck, label: "Check-ins" },
  { to: "/relatorios", icon: Sparkles, label: "Relatórios" },
  { to: "/import", icon: Upload, label: "Importar" },
  { to: "/config", icon: Settings, label: "Configurações" },
];

const BrandLogo = ({ size = "md" }: { size?: "sm" | "md" }) => (
  <div
    className={cn(
      "rounded-lg bg-[#0C2340] border-2 border-[#9B26B6] flex items-center justify-center text-white font-bold",
      size === "sm" ? "w-7 h-7 text-sm" : "w-9 h-9 text-base"
    )}
  >
    b
  </div>
);

export const AppLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-[#0C2340]">
        <div className="px-5 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div>
              <div className="text-sm font-bold tracking-tight text-white">Bernhoeft</div>
              <div className="text-[10px] text-sidebar-foreground uppercase tracking-widest">Gestão de Terceiros</div>
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
                    ? "text-white bg-[#9B26B6]/20 border-l-[3px] border-[#9B26B6] pl-[9px]"
                    : "text-sidebar-foreground hover:bg-white/[0.06] hover:text-white"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2 text-xs text-sidebar-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-white/[0.06] hover:text-white" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 border-b border-sidebar-border bg-[#0C2340]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" />
              <span className="text-sm font-bold text-white">Bernhoeft</span>
            </div>
            <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-white/[0.06] hover:text-white" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <nav className="flex border-t border-sidebar-border overflow-x-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2",
                    isActive ? "border-[#9B26B6] text-white" : "border-transparent text-sidebar-foreground"
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
