import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { Menu, Settings as SettingsIcon, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import appCss from "../styles.css?url";
import { ThemeProvider, themeBootstrapScript } from "@/components/theme/ThemeProvider";
import { SettingsDialog } from "@/components/theme/SettingsDialog";
import { UpdateNotesDialog } from "@/components/UpdateNotesDialog";
import { Toaster } from "@/components/ui/sonner";
import { Logo } from "@/components/Logo";

import { useHydrated } from "@/hooks/use-hydrated";
import { useStudyReminder } from "@/lib/notifications";

const SITE_NAME = "Japanese From Zero — Personal Study";
const SITE_DESC =
  "A personal companion for working through the Japanese From Zero curriculum: grammar in order, hiragana in step, kana and kanji practice on the side.";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-medium text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page isn't part of the study path.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again or head back to the home page.
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
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
      { title: SITE_NAME },
      { name: "description", content: SITE_DESC },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: SITE_NAME },
      { property: "og:description", content: SITE_DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        {children}
        <Toaster position="top-center" />
        <Scripts />
      </body>
    </html>
  );
}

const NAV_ITEMS = [
  { to: "/learn", label: "Learn" },
  { to: "/practice", label: "Practice" },
  { to: "/reference/phrases", label: "Reference" },
  { to: "/progress", label: "Progress" },
] as const;

function SettingsButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    setPortalRoot(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open settings"
        title="Settings"
        className={`inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground ${className}`}
      >
        <SettingsIcon aria-hidden className="size-3.5" />
        <span>Settings</span>
      </button>
      {open &&
        portalRoot &&
        createPortal(<SettingsDialog onClose={() => setOpen(false)} />, portalRoot)}
    </>
  );
}

function TopNav() {
  const [open, setOpen] = useState(false);
  const linkCls = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  const activeCls = "text-foreground font-medium";
  // Where you are, shown beside the wordmark since the phone menu hides it.
  // Client-only: a prerendered page can be served for another route, and a
  // label baked into that HTML would break hydration.
  const hydrated = useHydrated();
  const routeArea = useRouterState({
    select: (s) =>
      NAV_ITEMS.find((i) => s.location.pathname.startsWith(`/${i.to.split("/")[1]}`))?.label,
  });
  const area = hydrated ? routeArea : undefined;
  return (
    <header className="obi sticky top-0 z-40">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-display text-xl text-foreground">Zerokara</span>
            <span className="jp text-xs text-muted-foreground">ゼロカラ</span>
            {area ? (
              <span className="truncate text-sm text-muted-foreground">
                <span aria-hidden className="mr-2 text-border">
                  /
                </span>
                {area}
              </span>
            ) : null}
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={linkCls}
                activeProps={{ className: activeCls }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <SettingsButton />
        </div>

        {/* Mobile */}
        <div className="relative flex justify-end md:hidden">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-4 w-56 rounded-lg border border-border/70 bg-card shadow-held">
              <nav className="flex flex-col items-end gap-1 px-4 py-3 text-right">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    activeProps={{ className: "bg-muted text-foreground font-medium" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex justify-end border-t border-border/70 px-4 py-3">
                <SettingsButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function AppFrame() {
  useStudyReminder();
  return (
    <div className="paper min-h-screen overflow-x-clip bg-background text-foreground">
      <TopNav />
      <main>
        <Outlet />
      </main>
      <UpdateNotesDialog />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppFrame />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
