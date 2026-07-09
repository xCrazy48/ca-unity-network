import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { Moon, Sun } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme-toggle";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Lost pages</p>
        <h1 className="mt-4 font-display text-7xl font-semibold text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">
          This chapter isn't in the syllabus. Let's get you back to studying.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again, or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CA Unity Network — Your AI Command Center for CA Intermediate" },
      {
        name: "description",
        content:
          "AI-planned study, ICAI-aware chapter tracking, mock analytics, mistake book, and a rescue mode for the final stretch. Built for CA Inter aspirants.",
      },
      { name: "author", content: "Team Unity" },
      { name: "theme-color", content: "#151820" },
      { property: "og:title", content: "CA Unity Network — Your AI Command Center for CA Intermediate" },
      {
        property: "og:description",
        content:
          "AI-planned study, ICAI-aware chapter tracking, mock analytics, mistake book, and a rescue mode for the final stretch. Built for CA Inter aspirants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CA Unity Network — Your AI Command Center for CA Intermediate" },
      { name: "twitter:description", content: "AI-planned study, ICAI-aware chapter tracking, mock analytics, mistake book, and a rescue mode for the final stretch. Built for CA Inter aspirants." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f9260e4-3973-4241-bcfa-e2a1404b94df/id-preview-5401f36a--7773eeab-3fff-44b6-9ab3-ed3b394ba686.lovable.app-1783580673352.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f9260e4-3973-4241-bcfa-e2a1404b94df/id-preview-5401f36a--7773eeab-3fff-44b6-9ab3-ed3b394ba686.lovable.app-1783580673352.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: "/__l5e/assets-v1/96a5ec02-bd58-47f4-8243-faf2d6f0d902/unity-logo.jpg" },
      { rel: "apple-touch-icon", href: "/__l5e/assets-v1/96a5ec02-bd58-47f4-8243-faf2d6f0d902/unity-logo.jpg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('cun-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function FloatingThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="fixed bottom-4 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-elegant transition hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <FloatingThemeToggle />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
