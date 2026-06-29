# Miragie Front-End Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the visual quality of the internal "Miragie" app (sidebar + topbar shell, default-dark theme with toggle, polished login and existing pages) without changing any backend behavior.

**Architecture:** Add `next-themes` for a default-dark theme with a persisted light/dark toggle. Adopt shadcn's `sidebar` component family for the app shell (left sidebar + thin topbar). Introduce two reusable presentational primitives (`GlowBackground`, `PageHeader`) carrying the reference aesthetic (balanced headings, grayscale radial glows, dashed borders), then restyle the existing login, Ringkasan, Brand, and Upload pages on top of that foundation.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (style `base-nova`, `@base-ui/react`), next-themes, lucide-react, Vitest + @testing-library/react.

## Global Constraints

- **Monochrome only** — keep the existing grayscale OKLCH tokens in `app/globals.css`; no brand color, no gradient palette. Glows are grayscale (`hsla(0,0%,…)`).
- **Default dark** with a light/dark toggle persisted per user; no theme flash.
- **Navigation:** left sidebar + thin topbar.
- **App name / wordmark:** "**Miragie**" — monochrome **text** wordmark, no image logo.
- **Internal app only** — no public/marketing/landing pages.
- **No backend/data/behavior changes** — reuse `requireUser`, `signIn`/`signOut`, `listBrands`, and the upload preview/commit actions unchanged.
- Next 16: `cookies()`, `params`, `searchParams` are async (must `await`); middleware lives in `proxy.ts`.
- Already installed (do NOT reinstall): `next-themes`, `@testing-library/react`, `@testing-library/jest-dom`.
- shadcn config: style `base-nova`, ui alias `@/components/ui`, hooks alias `@/hooks`, icon library `lucide`.
- Follow TDD where logic is testable (presentational primitives); verify visual/shell work via `npx tsc --noEmit` + `npm run build` + manual check.

---

## File Structure

```
components/
├── theme-provider.tsx      # next-themes wrapper (client)
├── theme-toggle.tsx        # light/dark toggle button (client)
├── glow-background.tsx     # grayscale radial-glow accent layer
├── page-header.tsx         # title (text-balance) + description + actions
├── app-sidebar.tsx         # left nav using shadcn sidebar (client)
├── app-topbar.tsx          # topbar: trigger + title + theme toggle + user menu (client)
├── user-menu.tsx           # avatar dropdown w/ name, role, sign out (client)
├── ui/sidebar.tsx + deps   # added via shadcn CLI (sheet, tooltip, skeleton, separator)
├── ui/avatar.tsx           # added via shadcn CLI
└── app-nav.tsx             # DELETED (superseded by app-sidebar)
lib/
└── nav.ts                  # shared NAV_ITEMS (href, label, icon)
app/
├── layout.tsx              # MODIFY: ThemeProvider, default dark, metadata
├── login/page.tsx          # MODIFY: glow + wordmark + polish
└── (app)/
    ├── layout.tsx          # MODIFY: SidebarProvider + AppSidebar + AppTopbar
    ├── page.tsx            # MODIFY: Ringkasan dashboard landing
    ├── brands/page.tsx     # MODIFY: PageHeader + polish
    └── sales/upload/
        ├── page.tsx        # MODIFY: PageHeader
        └── upload-form.tsx # MODIFY: shadcn Select + polish
```

---

## Task 1: Theme foundation (next-themes, default dark, metadata)

**Files:**
- Create: `components/theme-provider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `ThemeProvider` (re-export of next-themes provider) used by the root layout.

- [ ] **Step 1: Create `components/theme-provider.tsx`**

```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Rewrite `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Miragie",
  description: "Dashboard sales & task tracker marketing untuk tim internal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; build compiles successfully. (The app now renders dark by default.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add next-themes provider with default-dark theme and app metadata"
```

---

## Task 2: Shared presentational primitives (GlowBackground, PageHeader) — TDD

**Files:**
- Create: `components/glow-background.tsx`, `components/page-header.tsx`
- Test: `components/__tests__/page-header.test.tsx`, `components/__tests__/glow-background.test.tsx`

**Interfaces:**
- Produces:
  - `GlowBackground({ className }: { className?: string })` — `aria-hidden` decorative layer.
  - `PageHeader({ title, description?, actions?, className? })` — page heading block.

- [ ] **Step 1: Write the failing test — `components/__tests__/page-header.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders the title as a heading", () => {
    render(<PageHeader title="Ringkasan" />);
    expect(screen.getByRole("heading", { name: "Ringkasan" })).toBeTruthy();
  });
  it("renders the description when provided", () => {
    render(<PageHeader title="Brand" description="Kelola brand" />);
    expect(screen.getByText("Kelola brand")).toBeTruthy();
  });
  it("renders an actions slot when provided", () => {
    render(<PageHeader title="X" actions={<button>Tambah</button>} />);
    expect(screen.getByRole("button", { name: "Tambah" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write the failing test — `components/__tests__/glow-background.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GlowBackground } from "@/components/glow-background";

describe("GlowBackground", () => {
  it("renders a decorative, aria-hidden layer", () => {
    const { container } = render(<GlowBackground />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm test -- page-header glow-background`
Expected: FAIL (modules missing).

- [ ] **Step 4: Implement — `components/glow-background.tsx`**

```tsx
import { cn } from "@/lib/utils";

/**
 * Decorative grayscale radial glows (adapted from the reference hero). Render
 * inside a `relative` container; sits behind content via -z-10.
 */
export function GlowBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,100%,0.08)_0,hsla(0,0%,100%,0.02)_60%,transparent_100%)]" />
      <div className="absolute bottom-0 right-0 h-[30rem] w-[30rem] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,100%,0.05)_0,transparent_70%)]" />
    </div>
  );
}
```

- [ ] **Step 5: Implement — `components/page-header.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npm test -- page-header glow-background`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add GlowBackground and PageHeader primitives with tests"
```

---

## Task 3: Add shadcn shell components + ThemeToggle

**Files:**
- Create (via CLI): `components/ui/sidebar.tsx`, `components/ui/sheet.tsx`, `components/ui/tooltip.tsx`, `components/ui/skeleton.tsx`, `components/ui/separator.tsx`, `components/ui/avatar.tsx`, `hooks/use-mobile.ts` (names may vary slightly by registry)
- Create: `components/theme-toggle.tsx`

**Interfaces:**
- Produces: shadcn `Sidebar*` exports, `Avatar`/`AvatarFallback`, `Separator`, `SidebarTrigger`, `SidebarProvider`, `SidebarInset`; and `ThemeToggle` button.

- [ ] **Step 1: Add the shadcn components**

Run: `npx shadcn@latest add sidebar avatar --yes`
Expected: creates `components/ui/sidebar.tsx` (+ its deps sheet/tooltip/skeleton/separator), `components/ui/avatar.tsx`, and a mobile hook. If the registry times out (transient), re-run the same command.

- [ ] **Step 2: Note the sidebar cookie constant**

Open `components/ui/sidebar.tsx` and find the cookie name constant (e.g. `SIDEBAR_COOKIE_NAME = "sidebar_state"`). Record the exact string — Task 4's layout reads this cookie. Use whatever value the generated file defines.

- [ ] **Step 3: Create `components/theme-toggle.tsx`**

```tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Before mount we don't know the resolved theme; assume dark (our default)
  // to avoid a hydration mismatch on the icon.
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Ganti tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      <span className="sr-only">Ganti tema</span>
    </Button>
  );
}
```

- [ ] **Step 4: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; build compiles (new components present, not yet wired into pages).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shadcn sidebar/avatar components and theme toggle"
```

---

## Task 4: App shell (sidebar + topbar + user menu)

**Files:**
- Create: `lib/nav.ts`, `components/app-sidebar.tsx`, `components/app-topbar.tsx`, `components/user-menu.tsx`
- Modify: `app/(app)/layout.tsx`
- Delete: `components/app-nav.tsx`

**Interfaces:**
- Consumes: `NAV_ITEMS` from `lib/nav.ts`; `SessionUser` from `@/lib/auth`; `signOut` from `@/app/login/actions`; shadcn `Sidebar*`, `Avatar`, `Separator`; `ThemeToggle`.
- Produces: `NAV_ITEMS: NavItem[]`, `AppSidebar()`, `AppTopbar({ user })`, `UserMenu({ user })`.

- [ ] **Step 1: Create `lib/nav.ts`**

```ts
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  PenTool,
  Tag,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/sales/upload", label: "Upload Data", icon: Upload },
  { href: "/sales/dashboard", label: "Dashboard Sales", icon: BarChart3 },
  { href: "/marketing/requests", label: "Request Desain", icon: PenTool },
  { href: "/brands", label: "Brand", icon: Tag },
];
```

- [ ] **Step 2: Create `components/app-sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          <span className="text-lg font-semibold tracking-tight">Miragie</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
```

> If the generated sidebar export names differ (e.g. no `SidebarRail`), adjust imports to match `components/ui/sidebar.tsx`. The core ones (`Sidebar`, `SidebarContent`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarHeader`) are stable.

- [ ] **Step 3: Create `components/user-menu.tsx`**

```tsx
"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/auth";

function initials(name: string, email: string): string {
  const base = name?.trim() || email;
  return base.slice(0, 2).toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.fullName, user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {user.fullName || user.email}
            </span>
            <span className="text-muted-foreground text-xs capitalize">
              {user.role}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <LogOut className="size-4" />
              Keluar
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Create `components/app-topbar.tsx`**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import type { SessionUser } from "@/lib/auth";

function titleFor(pathname: string): string {
  const item = NAV_ITEMS.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
  );
  return item?.label ?? "Miragie";
}

export function AppTopbar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-dashed px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h2 className="text-sm font-medium">{titleFor(pathname)}</h2>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Rewrite `app/(app)/layout.tsx`**

Use the cookie name recorded in Task 3 Step 2 (shown here as `sidebar_state`).

```tsx
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar user={user} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 6: Delete the old nav**

```bash
git rm components/app-nav.tsx
```

- [ ] **Step 7: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; build compiles. No remaining imports of `app-nav`.

- [ ] **Step 8: Manual check**

Run `npm run dev`, sign in. Expected: left sidebar with Miragie wordmark + 5 nav items (active item highlighted), collapsible via the topbar trigger; topbar shows page title, theme toggle (flips dark/light, persists on reload), and user menu with name/role + working "Keluar". Resize to mobile: sidebar becomes an off-canvas sheet.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: replace nav with shadcn sidebar shell, topbar, and user menu"
```

---

## Task 5: Polish the login page

**Files:**
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: `signIn` (unchanged), `GlowBackground`, shadcn `Card`/`Input`/`Label`/`Button`.

- [ ] **Step 1: Rewrite `app/login/page.tsx`**

```tsx
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GlowBackground } from "@/components/glow-background";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <GlowBackground />
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 space-y-1 text-center">
          <p className="text-2xl font-semibold tracking-tight">Miragie</p>
          <p className="text-muted-foreground text-sm">Masuk untuk melanjutkan</p>
        </div>
        <form action={signIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full">
            Masuk
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Manual check**

Visit `/login` (sign out first). Expected: centered card with "Miragie" wordmark over subtle glow; sign-in still works; a bad password shows the error text.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: polish login page with wordmark and glow"
```

---

## Task 6: Ringkasan dashboard landing

**Files:**
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `GlowBackground`, shadcn `Card`.

- [ ] **Step 1: Rewrite `app/(app)/page.tsx`**

Static placeholder KPI cards (real data arrives in the Sales Dashboard plan). Em dashes mark "no data yet".

```tsx
import { PageHeader } from "@/components/page-header";
import { GlowBackground } from "@/components/glow-background";
import { Card } from "@/components/ui/card";

const KPIS = [
  { label: "Total Omset", value: "—" },
  { label: "Total Pesanan", value: "—" },
  { label: "Total Pengunjung", value: "—" },
  { label: "Konversi", value: "—" },
];

export default function HomePage() {
  return (
    <div className="relative">
      <GlowBackground />
      <PageHeader
        title="Ringkasan"
        description="Selamat datang di Miragie. Pilih menu di samping untuk mulai."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-muted-foreground text-sm">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {kpi.value}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Belum ada data
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Manual check**

Visit `/`. Expected: PageHeader + 4 placeholder KPI cards in a responsive grid over a subtle glow.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: turn Ringkasan into a dashboard landing with placeholder KPIs"
```

---

## Task 7: Polish Brand and Upload pages

**Files:**
- Modify: `app/(app)/brands/page.tsx`, `app/(app)/sales/upload/page.tsx`, `app/(app)/sales/upload/upload-form.tsx`

**Interfaces:**
- Consumes: `PageHeader`; shadcn `Select` (for the brand picker); existing `listBrands`, `previewUpload`, `commitUpload` (unchanged).

- [ ] **Step 1: Rewrite `app/(app)/brands/page.tsx`**

```tsx
import { listBrands } from "@/lib/brands";
import { BrandForm } from "@/components/brand-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl">
      <PageHeader title="Brand" description="Kelola daftar brand untuk upload data." />
      <div className="space-y-4">
        <BrandForm />
        <Card className="divide-y p-0">
          {brands.length === 0 && (
            <p className="text-muted-foreground p-4 text-sm">Belum ada brand.</p>
          )}
          {brands.map((b) => (
            <div key={b.id} className="px-4 py-2.5 text-sm">
              {b.name}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/(app)/sales/upload/page.tsx`**

```tsx
import { listBrands } from "@/lib/brands";
import { UploadForm } from "./upload-form";
import { PageHeader } from "@/components/page-header";

export default async function UploadPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl">
      <PageHeader
        title="Upload Data Shopee"
        description="Pilih brand, lalu tarik file Global, Produk, dan Ads. Periode terbaca otomatis."
      />
      <UploadForm brands={brands} />
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `app/(app)/sales/upload/upload-form.tsx`** (shadcn Select + polish; behavior unchanged)

```tsx
"use client";

import { useState, useTransition } from "react";
import { previewUpload, commitUpload } from "./actions";
import type { UploadPreview } from "@/lib/sales/upload";
import type { Brand } from "@/lib/brands";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UploadForm({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState("");
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  async function onPreview(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      setPreview(await previewUpload(formData));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses file");
    }
  }

  function onSave() {
    if (!preview) return;
    start(async () => {
      try {
        await commitUpload(preview);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form action={onPreview} className="space-y-4">
          <input type="hidden" name="brandId" value={brandId} />
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih brand…" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="files">File (Global, Produk, Ads)</Label>
            <input
              id="files"
              type="file"
              name="files"
              multiple
              accept=".xlsx,.csv"
              required
              className="border-input file:text-foreground block w-full rounded-md border bg-transparent text-sm file:mr-3 file:border-0 file:bg-transparent file:py-2 file:font-medium"
            />
          </div>
          <Button type="submit" disabled={!brandId}>
            Proses & Pratinjau
          </Button>
        </form>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {preview && (
        <Card className="space-y-2 p-5 text-sm">
          <p>
            Periode:{" "}
            <b>
              {preview.period
                ? `${preview.period.start} → ${preview.period.end}`
                : "tidak terbaca"}
            </b>
          </p>
          <p>
            Data global harian: <b>{preview.global?.daily.length ?? 0}</b> baris
          </p>
          <p>
            Produk: <b>{preview.product?.summary.length ?? 0}</b> (variasi{" "}
            {preview.product?.detail.length ?? 0})
          </p>
          <p>
            Iklan: <b>{preview.ads?.length ?? 0}</b>
          </p>
          <Button onClick={onSave} disabled={pending || !preview.period}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
          {saved && (
            <p className="text-sm text-green-600 dark:text-green-500">
              Tersimpan. Data periode ini telah diperbarui.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: exits 0; build compiles.

- [ ] **Step 5: Manual check**

Visit `/brands` and `/sales/upload`. Expected: both show a PageHeader; brand list/add still work; upload uses a styled brand dropdown (submit disabled until a brand is chosen), preview + save behavior unchanged.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: polish brand and upload pages with PageHeader and styled controls"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass (the 32 logic tests + the new primitive smoke tests).

- [ ] **Step 2: Type-check and production build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; build succeeds; routes `/`, `/login`, `/brands`, `/sales/upload` listed.

- [ ] **Step 3: Manual visual pass**

Run `npm run dev`. Verify in the browser:
- Default theme is **dark**; toggle switches to light and **persists** across reload.
- Sidebar: wordmark, 5 items, active highlight, collapse/expand, mobile sheet.
- Topbar: correct page title per route, theme toggle, user menu (name/role + Keluar works).
- Login, Ringkasan, Brand, Upload all render cleanly in both themes, desktop and mobile.

- [ ] **Step 4: Commit any final tweaks**

```bash
git add -A
git commit -m "chore: final front-end revamp verification tweaks"
```

---

## Self-Review

**Spec coverage:**
- Theme foundation (next-themes, default dark, metadata) → Task 1. ✓
- Monochrome palette unchanged → Global Constraints; no token edits in any task. ✓
- GlowBackground + PageHeader primitives → Task 2 (TDD). ✓
- shadcn sidebar/avatar + ThemeToggle → Task 3. ✓
- App shell (AppSidebar, AppTopbar, UserMenu, layout, delete app-nav, shared nav) → Task 4. ✓
- Login polish → Task 5. ✓
- Ringkasan landing → Task 6. ✓
- Brand + Upload polish (shadcn Select) → Task 7. ✓
- Responsive (mobile sheet), a11y (ARIA via shadcn, labels), testing (tsc/build/manual + smoke tests) → Tasks 4,7,8. ✓
- No backend/behavior changes → all tasks reuse existing actions; only presentational edits. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; every run step has a command + expected result. The "placeholder KPI" cards in Task 6 are an intentional, fully-specified static UI, not an unfinished step. ✓

**Type consistency:** `NavItem`/`NAV_ITEMS` defined in Task 4 Step 1 and consumed unchanged in `AppSidebar`/`AppTopbar`. `SessionUser` (from Plan 1 `lib/auth`) consumed by `UserMenu`/`AppTopbar`. `UploadPreview`/`Brand` reused unchanged in Task 7. `ThemeProvider` (Task 1) consumed by root layout; `ThemeToggle` (Task 3) consumed by `AppTopbar` (Task 4). ✓

**Risk note:** shadcn `base-nova` export names for the sidebar may differ slightly from the canonical set; Task 4 Step 2 flags adjusting imports to the generated file, and Task 3 Step 2 records the exact cookie constant the layout depends on.
```
