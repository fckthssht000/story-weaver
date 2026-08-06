import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BookOpen, Library, PenLine, User } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { syncDownloads, syncProgress } from "@/services/syncService";
import { cn } from "@/lib/utils";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to stories
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "StoryApp — Read and write short fiction" },
      {
        name: "description",
        content:
          "A reading and writing home for short fiction. Publish chapters, read beautifully typeset stories, and download them for offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..600&family=Nunito+Sans:opsz,wght@6..12,300..800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const TABS = [
  { to: "/", label: "Discover", icon: BookOpen },
  { to: "/library", label: "Library", icon: Library },
  { to: "/write", label: "Write", icon: PenLine },
  { to: "/account", label: "Account", icon: User },
] as const;

function Chrome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const immersive = pathname.startsWith("/read/");

  if (immersive) return <Outlet />;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            Story<span className="text-primary">App</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
                activeOptions={{ exact: t.to === "/" }}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.65rem] text-muted-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
              activeOptions={{ exact: t.to === "/" }}
            >
              {({ isActive }) => (
                <>
                  <t.icon className={cn("size-5", isActive && "stroke-[2.4]")} />
                  {t.label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function SyncAgent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    const run = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.auth.getSession();
      await syncProgress(data.session?.user.id ?? null);
      await syncDownloads();
      queryClient.invalidateQueries({ queryKey: ["library"] });
    };
    void run();
    document.addEventListener("visibilitychange", run);
    window.addEventListener("online", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("online", run);
    };
  }, [queryClient]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SyncAgent />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Chrome />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
