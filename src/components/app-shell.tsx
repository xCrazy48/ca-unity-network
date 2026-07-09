import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode } from "react";
import {
  Bell,
  BookMarked,
  Brain,
  CalendarDays,
  ClipboardList,
  FileCheck,
  FlaskConical,
  LayoutDashboard,
  LibraryBig,
  LineChart,
  ListChecks,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,

  Target,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocalReminders } from "@/hooks/use-reminders";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnityLogo } from "@/components/logo";



const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/study-planner", label: "AI Study Planner", icon: Sparkles },
  { to: "/mentoring", label: "1:1 Mentoring", icon: MessageCircle },
  { to: "/calendar", label: "Exam Calendar", icon: CalendarDays },
  { to: "/papers", label: "Papers", icon: LibraryBig },
  { to: "/chapters", label: "Chapters", icon: Target },
  { to: "/mocks", label: "Mock Tests", icon: ClipboardList },
  { to: "/mtp", label: "MTPs", icon: FileCheck },
  { to: "/rtp-pyq", label: "RTP & PYQ", icon: ListChecks },
  { to: "/mistakes", label: "Mistake Book", icon: BookMarked },
  { to: "/formulas", label: "Formula Vault", icon: FlaskConical },
  { to: "/planner", label: "Planner", icon: ListChecks },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
  { to: "/reflection", label: "Weekly Reflection", icon: LineChart },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/ai", label: "AI Engine", icon: Brain },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useLocalReminders();
  useActivityTracker();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/dashboard" className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <UnityLogo size="sm" />
          <span className="font-display text-lg font-semibold">CA Unity Network</span>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-elegant"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-gold" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Settings className="h-4 w-4" /> Profile
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gold hover:bg-sidebar-accent/50"
            >
              <Settings className="h-4 w-4" /> Admin
            </Link>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          {profile?.full_name && (
            <div className="mt-3 truncate px-3 text-xs text-muted-foreground">
              {profile.full_name}
            </div>
          )}
        </div>

      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <UnityLogo size="xs" />
          <span className="font-display text-base font-semibold">CA Unity Network</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={signOut} className="text-sm text-muted-foreground">Sign out</button>
        </div>

      </div>

      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-border bg-sidebar p-1">
        {nav.slice(0, 5).map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 rounded-md py-2 text-[10px] ${
                active ? "text-gold" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
