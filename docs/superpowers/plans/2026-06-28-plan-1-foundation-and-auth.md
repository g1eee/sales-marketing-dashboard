# Foundation & Auth Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js app with Supabase auth, the full database schema, login + route protection, an app shell with navigation, and a managed brands list — the shared foundation every later plan builds on.

**Architecture:** Next.js App Router (TypeScript) on Vercel, talking to Supabase (Postgres + Auth). Pure logic lives in `lib/` (unit-tested with Vitest); UI components only render. Auth uses Supabase email/password with a `profiles` table for role. All sales/marketing data hangs off `report_periods` and `brands`.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, @supabase/supabase-js + @supabase/ssr, Recharts (later plans), SheetJS (later plans), Vitest + @testing-library, deployed on Vercel.

## Global Constraints

- Platform scope this stage: **Shopee only**. Schema carries a `platform` column (default `'shopee'`) so TikTok can be added later without migration churn.
- Every data row is scoped by **brand** (`brand_id`) and, for sales data, by **`report_periods`**.
- Brand names come from a **managed list** (`brands` table) chosen via dropdown — never free-typed at upload — to keep naming consistent.
- All authenticated users may access all features this stage. `profiles.role` (`admin`/`sales`/`marketing`) is stored but **not** enforced yet.
- Money stored as integer rupiah (no decimals). Rates/percentages stored as numeric fractions or percent — see schema comments; be consistent.
- Pure logic in `lib/`, unit-tested. UI components do not contain parsing/aggregation logic.
- Indonesian UI copy (matches the team's language), code identifiers in English.

---

## File Structure

```
sales-marketing-dashboard/
├── app/
│   ├── layout.tsx                 # root layout
│   ├── globals.css                # tailwind + shadcn tokens
│   ├── login/page.tsx             # login form
│   ├── (app)/layout.tsx           # authenticated shell (nav + guard)
│   ├── (app)/page.tsx             # home/overview placeholder
│   └── (app)/brands/page.tsx      # brands list + add
├── components/
│   ├── ui/                        # shadcn components (generated)
│   ├── app-nav.tsx                # sidebar/top nav
│   └── brand-form.tsx             # add-brand form
├── lib/
│   ├── supabase/client.ts         # browser client
│   ├── supabase/server.ts         # server client (cookies)
│   ├── supabase/middleware.ts     # session refresh helper
│   ├── auth.ts                    # getCurrentUser / requireUser helpers
│   └── brands.ts                  # listBrands / createBrand + validation
├── lib/__tests__/
│   ├── brands.test.ts
│   └── auth.test.ts
├── middleware.ts                  # route protection
├── supabase/migrations/0001_init.sql
├── vitest.config.ts
├── .env.local.example
└── docs/superpowers/...
```

---

## Task 1: Scaffold Next.js + TypeScript + Tailwind + Vitest

**Files:**
- Create: project files via `create-next-app`, `vitest.config.ts`, `package.json` scripts
- Test: `lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a runnable Next.js app (`npm run dev`), a working test runner (`npm test`).

- [ ] **Step 1: Scaffold the app**

Run from `/home/gieee/sales-marketing-dashboard` (the git repo already exists; scaffold in place):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```

If prompted to proceed in a non-empty directory, accept (keeps `docs/` and `.git`). Expected: `app/`, `package.json`, `tsconfig.json` created.

- [ ] **Step 2: Install Vitest + testing libs**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 4: Add test script to `package.json`**

Add to `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Write a smoke test**

`lib/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs tests", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 7: Verify the app builds**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js app with tailwind and vitest"
```

---

## Task 2: Initialize shadcn/ui

**Files:**
- Create: `components.json`, `components/ui/*`, updates to `app/globals.css`

**Interfaces:**
- Produces: shadcn components importable from `@/components/ui/*` (button, input, card, table, dialog, select, badge, sonner/toast).

- [ ] **Step 1: Init shadcn**

```bash
npx shadcn@latest init -d
```

Expected: `components.json` created, `globals.css` updated with CSS variables.

- [ ] **Step 2: Add the components used across plans**

```bash
npx shadcn@latest add button input label card table dialog select badge sonner dropdown-menu tabs
```

Expected: files created under `components/ui/`.

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add shadcn/ui and base components"
```

---

## Task 3: Supabase clients + environment

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `.env.local.example`

**Interfaces:**
- Produces:
  - `createBrowserClient()` → Supabase client for client components (from `lib/supabase/client.ts`).
  - `createServerClient()` → `Promise<SupabaseClient>` for server components/actions (from `lib/supabase/server.ts`), reads/writes cookies.
  - `updateSession(request: NextRequest): Promise<NextResponse>` (from `lib/supabase/middleware.ts`).

- [ ] **Step 1: Install Supabase libs**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create `.env.local.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Document: copy to `.env.local` and fill from the Supabase project (Settings → API). Create a free Supabase project first.

- [ ] **Step 3: Browser client — `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Server client — `lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component; safe to ignore when middleware refreshes
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: Session middleware helper — `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}
```

- [ ] **Step 6: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add supabase browser/server clients and session helper"
```

---

## Task 4: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `profiles`, `brands`, `report_periods`, `global_daily`, `global_source`, `product_summary`, `product_detail`, `ads_summary`, `design_requests`; a trigger that creates a `profiles` row on signup.

- [ ] **Step 1: Write the migration — `supabase/migrations/0001_init.sql`**

```sql
-- Enums
create type user_role as enum ('admin', 'sales', 'marketing');
create type order_status as enum ('dibuat', 'siap_dikirim', 'dibayar');
create type design_status as enum ('baru', 'dikerjakan', 'review', 'revisi', 'selesai');

-- Profiles (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'sales',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on new auth user
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Brands (managed list)
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Report periods (parent of all sales data for one upload)
create table report_periods (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  platform text not null default 'shopee',
  period_start date not null,
  period_end date not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (brand_id, platform, period_start, period_end)
);

-- Daily global metrics (per period, per date, per order status)
create table global_daily (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  date date not null,
  status order_status not null,
  total_penjualan bigint not null default 0,      -- rupiah
  total_pesanan integer not null default 0,
  penjualan_per_pesanan bigint not null default 0,-- rupiah
  produk_diklik integer,
  total_pengunjung integer,
  konversi numeric(7,4),                          -- fraction, e.g. 0.0274 = 2.74%
  pesanan_dibatalkan integer,
  unique (period_id, date, status)
);

-- Source breakdown (per period)
create table global_source (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  source text not null,            -- 'halaman_produk' | 'live' | 'video' | 'affiliate' | 'iklan_shopee'
  penjualan bigint not null default 0,
  unique (period_id, source)
);

-- Product summary (per period, per product)
create table product_summary (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  kode_produk text not null,
  product_name text not null default '',
  penjualan bigint not null default 0,
  dilihat integer,
  diklik integer,
  total_pesanan integer,
  persentase_klik numeric(7,4),
  konversi numeric(7,4),
  total_pembeli integer,
  extra jsonb not null default '{}'::jsonb,
  unique (period_id, kode_produk)
);

-- Product detail (per period, per product + variation)
create table product_detail (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  kode_produk text not null,
  kode_variasi text not null default '-',
  nama_variasi text not null default '-',
  sku_induk text,
  penjualan bigint not null default 0,
  dilihat integer,
  diklik integer,
  konversi numeric(7,4),
  extra jsonb not null default '{}'::jsonb,
  unique (period_id, kode_produk, kode_variasi)
);

-- Ads summary (per period, per ad)
create table ads_summary (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  nama_iklan text not null,
  status text,
  jenis_iklan text,
  dilihat integer,
  klik integer,
  ctr numeric(7,4),
  add_to_cart integer,
  konversi integer,
  cvr numeric(7,4),
  biaya_per_konversi bigint,
  produk_terjual integer,
  omzet bigint,
  biaya bigint,
  roas numeric(10,2),
  acos numeric(7,4),
  voucher bigint,
  extra jsonb not null default '{}'::jsonb,
  unique (period_id, nama_iklan)
);

-- Design requests (marketing task tracker)
create table design_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete set null,
  asset_type text not null,
  title text not null,
  brief text not null default '',
  deadline date,
  status design_status not null default 'baru',
  result_link text,
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase SQL Editor (paste the file) OR via the Supabase CLI:

```bash
# CLI option (requires `supabase login` + `supabase link`)
supabase db push
```

Expected: all tables created, no errors. Verify in Supabase → Table Editor that the 9 tables exist.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add initial database schema migration"
```

---

## Task 5: Brands logic (listBrands / createBrand) — TDD

**Files:**
- Create: `lib/brands.ts`
- Test: `lib/__tests__/brands.test.ts`

**Interfaces:**
- Produces:
  - `normalizeBrandName(raw: string): string` — trims, collapses internal whitespace.
  - `validateBrandName(raw: string): { ok: true; value: string } | { ok: false; error: string }` — rejects empty / >80 chars.
  - (Server action `createBrand` and `listBrands` wrap a Supabase client; the pure validation/normalize functions are unit-tested here.)

- [ ] **Step 1: Write the failing test — `lib/__tests__/brands.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { normalizeBrandName, validateBrandName } from "@/lib/brands";

describe("normalizeBrandName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeBrandName("  Kalova   Official ")).toBe("Kalova Official");
  });
});

describe("validateBrandName", () => {
  it("accepts a normal name", () => {
    expect(validateBrandName("Kalova Official")).toEqual({
      ok: true,
      value: "Kalova Official",
    });
  });
  it("rejects empty", () => {
    const r = validateBrandName("   ");
    expect(r.ok).toBe(false);
  });
  it("rejects too long", () => {
    const r = validateBrandName("x".repeat(81));
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- brands`
Expected: FAIL ("Cannot find module '@/lib/brands'" or undefined export).

- [ ] **Step 3: Implement — `lib/brands.ts` (pure functions + server helpers)**

```ts
import { createClient } from "@/lib/supabase/server";

export function normalizeBrandName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateBrandName(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = normalizeBrandName(raw);
  if (value.length === 0) return { ok: false, error: "Nama brand wajib diisi" };
  if (value.length > 80) return { ok: false, error: "Nama brand maksimal 80 karakter" };
  return { ok: true, value };
}

export interface Brand {
  id: string;
  name: string;
}

export async function listBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createBrand(rawName: string): Promise<Brand> {
  const v = validateBrandName(rawName);
  if (!v.ok) throw new Error(v.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({ name: v.value })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- brands`
Expected: PASS (all brand tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add brand validation and data helpers with tests"
```

---

## Task 6: Auth helpers — TDD

**Files:**
- Create: `lib/auth.ts`
- Test: `lib/__tests__/auth.test.ts`

**Interfaces:**
- Produces:
  - `type SessionUser = { id: string; email: string; role: "admin" | "sales" | "marketing"; fullName: string }`
  - `mapProfileToSessionUser(authUser, profileRow): SessionUser` — pure mapper (unit-tested).
  - `getCurrentUser(): Promise<SessionUser | null>` — server helper using Supabase.
  - `requireUser(): Promise<SessionUser>` — redirects to `/login` if null.

- [ ] **Step 1: Write the failing test — `lib/__tests__/auth.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { mapProfileToSessionUser } from "@/lib/auth";

describe("mapProfileToSessionUser", () => {
  it("merges auth user and profile row", () => {
    const result = mapProfileToSessionUser(
      { id: "u1", email: "a@b.com" },
      { full_name: "Andi", role: "sales" },
    );
    expect(result).toEqual({
      id: "u1",
      email: "a@b.com",
      role: "sales",
      fullName: "Andi",
    });
  });
  it("defaults role to sales when profile missing", () => {
    const result = mapProfileToSessionUser({ id: "u1", email: "a@b.com" }, null);
    expect(result.role).toBe("sales");
    expect(result.fullName).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- auth`
Expected: FAIL (module/export missing).

- [ ] **Step 3: Implement — `lib/auth.ts`**

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "sales" | "marketing";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

export function mapProfileToSessionUser(
  authUser: { id: string; email?: string | null },
  profile: { full_name?: string | null; role?: Role | null } | null,
): SessionUser {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    role: profile?.role ?? "sales",
    fullName: profile?.full_name ?? "",
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  return mapProfileToSessionUser(user, profile);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth session helpers with tests"
```

---

## Task 7: Route protection middleware

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `updateSession` from `lib/supabase/middleware.ts` (Task 3).
- Produces: unauthenticated requests to non-`/login` routes redirect to `/login`.

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/`.
Expected: redirected to `/login` (page itself comes in Task 8; a 404 at `/login` is acceptable here — the redirect is what we're verifying).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: protect routes via supabase session middleware"
```

---

## Task 8: Login page + sign-out

**Files:**
- Create: `app/login/page.tsx`, `app/login/actions.ts`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`.
- Produces: server actions `signIn(formData)` and `signOut()`.

- [ ] **Step 1: Create login server actions — `app/login/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=" + encodeURIComponent("Email atau password salah"));
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Create login page — `app/login/page.tsx`**

```tsx
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-4 text-xl font-semibold">Masuk</h1>
        <form action={signIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">Masuk</Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create a test user in Supabase**

In Supabase → Authentication → Users → Add user (email + password, mark email confirmed). This is the Admin/SPV account.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, go to `/login`, sign in with the test user.
Expected: redirected to `/` (home placeholder created in Task 9; if `/` 404s, that's fine here — successful auth + redirect is the check). Then verify a `profiles` row exists for the user in Supabase.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add login page and sign-in/sign-out actions"
```

---

## Task 9: Authenticated app shell + navigation

**Files:**
- Create: `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `components/app-nav.tsx`

**Interfaces:**
- Consumes: `requireUser` (Task 6), `signOut` (Task 8).
- Produces: a guarded layout wrapping all app routes with nav links to Dashboard, Upload, Sales Dashboard, Marketing Requests, Brands.

- [ ] **Step 1: Create the nav — `components/app-nav.tsx`**

```tsx
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth";

const links = [
  { href: "/", label: "Ringkasan" },
  { href: "/sales/upload", label: "Upload Data" },
  { href: "/sales/dashboard", label: "Dashboard Sales" },
  { href: "/marketing/requests", label: "Request Desain" },
  { href: "/brands", label: "Brand" },
];

export function AppNav({ user }: { user: SessionUser }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold">{user.fullName || user.email}</p>
        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
      </div>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="rounded px-3 py-2 text-sm hover:bg-muted">
          {l.label}
        </Link>
      ))}
      <form action={signOut} className="mt-auto">
        <Button variant="outline" size="sm" className="w-full">Keluar</Button>
      </form>
    </aside>
  );
}
```

- [ ] **Step 2: Create the guarded layout — `app/(app)/layout.tsx`**

```tsx
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <AppNav user={user} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create the home placeholder — `app/(app)/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Ringkasan</h1>
      <p className="text-muted-foreground">Selamat datang. Pilih menu di samping.</p>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in.
Expected: home page with sidebar nav; "Keluar" signs out and returns to `/login`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add authenticated app shell and navigation"
```

---

## Task 10: Brands page (list + add)

**Files:**
- Create: `app/(app)/brands/page.tsx`, `app/(app)/brands/actions.ts`, `components/brand-form.tsx`

**Interfaces:**
- Consumes: `listBrands`, `createBrand` (Task 5).
- Produces: a page listing brands and a form to add one (used as the source for the upload dropdown in Plan 2).

- [ ] **Step 1: Create the action — `app/(app)/brands/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createBrand } from "@/lib/brands";

export async function addBrand(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  await createBrand(name);
  revalidatePath("/brands");
}
```

- [ ] **Step 2: Create the form — `components/brand-form.tsx`**

```tsx
import { addBrand } from "@/app/(app)/brands/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BrandForm() {
  return (
    <form action={addBrand} className="flex gap-2">
      <Input name="name" placeholder="Nama brand baru" required />
      <Button type="submit">Tambah</Button>
    </form>
  );
}
```

- [ ] **Step 3: Create the page — `app/(app)/brands/page.tsx`**

```tsx
import { listBrands } from "@/lib/brands";
import { BrandForm } from "@/components/brand-form";
import { Card } from "@/components/ui/card";

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Brand</h1>
      <BrandForm />
      <Card className="divide-y p-0">
        {brands.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Belum ada brand.</p>
        )}
        {brands.map((b) => (
          <div key={b.id} className="px-4 py-2 text-sm">{b.name}</div>
        ))}
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in, go to `/brands`, add "Kalova Official".
Expected: brand appears in the list; re-adding the same name shows an error (unique constraint) rather than a duplicate.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all tests pass (smoke, brands, auth).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add brands page with list and add form"
```

---

## Self-Review

**Spec coverage (Plan 1 portion):**
- Tech stack (Next.js+TS+Tailwind+shadcn+Supabase+Vitest) → Tasks 1–3. ✓
- DB schema for all entities → Task 4. ✓
- Auth (login email/password, profiles+role, route protection) → Tasks 3,6,7,8. ✓
- App shell/nav → Task 9. ✓
- Brands managed list (consistent naming) → Tasks 5,10. ✓
- `platform` default `shopee`, brand/period scoping, role stored-not-enforced → Task 4 schema + Global Constraints. ✓
- Sales parsing/upload, dashboard/analytics, marketing tracker → **out of scope for Plan 1** (Plans 2–4). ✓

**Placeholder scan:** Home and dashboard route bodies are intentionally minimal placeholders, not plan placeholders — every step has concrete code/commands. No TBD/TODO. ✓

**Type consistency:** `SessionUser`/`Role` defined in Task 6 and consumed unchanged in Tasks 9. `Brand` defined in Task 5, consumed in Task 10. `createClient` naming consistent across `lib/supabase/{client,server}.ts`. ✓
