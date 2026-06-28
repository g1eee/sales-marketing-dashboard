# Marketing: Task Tracker Implementation Plan (Plan 4 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let sales create creative-design requests and marketing track them through statuses (Baru → Dikerjakan → Review → Revisi → Selesai), with a board view, a list view, a create form, and a detail page that updates status and stores a result link.

**Architecture:** Pure validation lives in `lib/marketing/requests.ts` (unit-tested). Data helpers wrap Supabase. The board/list page is a server component; status changes and the create form use server actions. Deadlines are highlighted by a small pure helper.

**Tech Stack:** Next.js server components + server actions, Supabase, Vitest.

## Global Constraints

- Statuses: `baru`, `dikerjakan`, `review`, `revisi`, `selesai` (matches the `design_status` enum from Plan 1).
- A request requires `asset_type`, `title`; `brief`, `deadline`, `brand_id`, `result_link` are optional.
- `result_link`, when present, must be a valid `http(s)` URL.
- `requested_by` = current user; set automatically.
- No file attachments this stage (link only).
- Pure validation in `lib/marketing/`; UI does no validation logic.

---

## File Structure

```
lib/marketing/
├── requests.ts         # validateRequestInput, isValidUrl, deadlineState, data helpers
└── __tests__/requests.test.ts
app/(app)/marketing/requests/
├── page.tsx            # board + list toggle
├── board.tsx           # client: columns by status + status change
├── actions.ts          # createRequest, updateStatus, setResultLink
├── new/page.tsx        # create form
└── [id]/page.tsx       # detail + status + result link
```

The asset-type options are a constant list in `lib/marketing/requests.ts`: `["Banner Toko", "Flyer Ads", "IG Story"]` (extensible).

---

## Task 1: Request validation + helpers — TDD

**Files:**
- Create: `lib/marketing/requests.ts`
- Test: `lib/marketing/__tests__/requests.test.ts`

**Interfaces:**
- Produces:
  - `const ASSET_TYPES: string[]`
  - `const STATUSES: readonly ["baru","dikerjakan","review","revisi","selesai"]`
  - `type DesignStatus = (typeof STATUSES)[number]`
  - `isValidUrl(s: string): boolean`
  - `interface RequestInput { asset_type: string; title: string; brief: string; deadline: string | null; brand_id: string | null; }`
  - `validateRequestInput(raw: Record<string, string>): { ok: true; value: RequestInput } | { ok: false; error: string }`
  - `deadlineState(deadline: string | null, today: string): "none" | "ok" | "soon" | "overdue"` — overdue if past, soon if within 2 days.

- [ ] **Step 1: Write the failing test — `lib/marketing/__tests__/requests.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  isValidUrl, validateRequestInput, deadlineState, STATUSES,
} from "@/lib/marketing/requests";

describe("isValidUrl", () => {
  it("accepts http(s)", () => {
    expect(isValidUrl("https://drive.google.com/x")).toBe(true);
  });
  it("rejects non-url", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("ftp://x")).toBe(false);
  });
});

describe("validateRequestInput", () => {
  it("accepts a valid request", () => {
    const r = validateRequestInput({
      asset_type: "Banner Toko", title: "Promo 6.6", brief: "merah", deadline: "2026-06-30", brand_id: "",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("Promo 6.6");
      expect(r.value.brand_id).toBeNull();
      expect(r.value.deadline).toBe("2026-06-30");
    }
  });
  it("rejects missing title", () => {
    const r = validateRequestInput({ asset_type: "Banner Toko", title: "  ", brief: "", deadline: "", brand_id: "" });
    expect(r.ok).toBe(false);
  });
  it("rejects unknown asset type", () => {
    const r = validateRequestInput({ asset_type: "Hologram", title: "x", brief: "", deadline: "", brand_id: "" });
    expect(r.ok).toBe(false);
  });
});

describe("deadlineState", () => {
  it("none when no deadline", () => {
    expect(deadlineState(null, "2026-06-28")).toBe("none");
  });
  it("overdue when past", () => {
    expect(deadlineState("2026-06-27", "2026-06-28")).toBe("overdue");
  });
  it("soon when within two days", () => {
    expect(deadlineState("2026-06-29", "2026-06-28")).toBe("soon");
  });
  it("ok when far", () => {
    expect(deadlineState("2026-07-15", "2026-06-28")).toBe("ok");
  });
});

describe("STATUSES", () => {
  it("has the five statuses in order", () => {
    expect(STATUSES).toEqual(["baru", "dikerjakan", "review", "revisi", "selesai"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- requests`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/marketing/requests.ts` (pure parts + data helpers)**

```ts
import { createClient } from "@/lib/supabase/server";

export const ASSET_TYPES = ["Banner Toko", "Flyer Ads", "IG Story"];
export const STATUSES = ["baru", "dikerjakan", "review", "revisi", "selesai"] as const;
export type DesignStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<DesignStatus, string> = {
  baru: "Baru", dikerjakan: "Dikerjakan", review: "Review", revisi: "Revisi", selesai: "Selesai",
};

export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface RequestInput {
  asset_type: string;
  title: string;
  brief: string;
  deadline: string | null;
  brand_id: string | null;
}

export function validateRequestInput(
  raw: Record<string, string>,
): { ok: true; value: RequestInput } | { ok: false; error: string } {
  const asset_type = (raw.asset_type ?? "").trim();
  const title = (raw.title ?? "").trim();
  if (!ASSET_TYPES.includes(asset_type)) return { ok: false, error: "Jenis aset tidak valid" };
  if (title.length === 0) return { ok: false, error: "Judul wajib diisi" };
  if (title.length > 120) return { ok: false, error: "Judul maksimal 120 karakter" };
  return {
    ok: true,
    value: {
      asset_type,
      title,
      brief: (raw.brief ?? "").trim(),
      deadline: (raw.deadline ?? "").trim() || null,
      brand_id: (raw.brand_id ?? "").trim() || null,
    },
  };
}

export function deadlineState(
  deadline: string | null,
  today: string,
): "none" | "ok" | "soon" | "overdue" {
  if (!deadline) return "none";
  const d = new Date(deadline + "T00:00:00Z").getTime();
  const t = new Date(today + "T00:00:00Z").getTime();
  const days = (d - t) / 86400000;
  if (days < 0) return "overdue";
  if (days <= 2) return "soon";
  return "ok";
}

export interface DesignRequest {
  id: string;
  asset_type: string;
  title: string;
  brief: string;
  deadline: string | null;
  status: DesignStatus;
  result_link: string | null;
  brand_id: string | null;
  created_at: string;
}

export async function listRequests(): Promise<DesignRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_requests")
    .select("id, asset_type, title, brief, deadline, status, result_link, brand_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DesignRequest[];
}

export async function getRequest(id: string): Promise<DesignRequest | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_requests")
    .select("id, asset_type, title, brief, deadline, status, result_link, brand_id, created_at")
    .eq("id", id)
    .single();
  return (data as DesignRequest) ?? null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- requests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add design-request validation and data helpers with tests"
```

---

## Task 2: Server actions (create / update status / set link)

**Files:**
- Create: `app/(app)/marketing/requests/actions.ts`

**Interfaces:**
- Consumes: `validateRequestInput`, `isValidUrl`, `STATUSES`, `requireUser`, `createClient`.
- Produces: `createRequest(formData)`, `updateStatus(id, status)`, `setResultLink(id, link)`.

- [ ] **Step 1: Implement — `app/(app)/marketing/requests/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  validateRequestInput, isValidUrl, STATUSES, type DesignStatus,
} from "@/lib/marketing/requests";

export async function createRequest(formData: FormData) {
  const user = await requireUser();
  const raw = {
    asset_type: String(formData.get("asset_type") ?? ""),
    title: String(formData.get("title") ?? ""),
    brief: String(formData.get("brief") ?? ""),
    deadline: String(formData.get("deadline") ?? ""),
    brand_id: String(formData.get("brand_id") ?? ""),
  };
  const v = validateRequestInput(raw);
  if (!v.ok) throw new Error(v.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("design_requests")
    .insert({ ...v.value, requested_by: user.id });
  if (error) throw error;
  redirect("/marketing/requests");
}

export async function updateStatus(id: string, status: DesignStatus) {
  await requireUser();
  if (!STATUSES.includes(status)) throw new Error("Status tidak valid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("design_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/marketing/requests");
  revalidatePath(`/marketing/requests/${id}`);
}

export async function setResultLink(id: string, link: string) {
  await requireUser();
  const trimmed = link.trim();
  if (trimmed && !isValidUrl(trimmed)) throw new Error("Link harus berupa URL http(s) yang valid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("design_requests")
    .update({ result_link: trimmed || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/marketing/requests/${id}`);
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add marketing request server actions"
```

---

## Task 3: New-request form

**Files:**
- Create: `app/(app)/marketing/requests/new/page.tsx`

**Interfaces:**
- Consumes: `createRequest`, `ASSET_TYPES`, `listBrands`.

- [ ] **Step 1: Implement — `app/(app)/marketing/requests/new/page.tsx`**

```tsx
import { createRequest } from "../actions";
import { ASSET_TYPES } from "@/lib/marketing/requests";
import { listBrands } from "@/lib/brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default async function NewRequestPage() {
  const brands = await listBrands();
  return (
    <Card className="max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold">Request Desain Baru</h1>
      <form action={createRequest} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="asset_type">Jenis Aset</Label>
          <select id="asset_type" name="asset_type" required className="w-full rounded border p-2">
            {ASSET_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Judul / Brief</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brief">Detail (opsional)</Label>
          <textarea id="brief" name="brief" rows={3} className="w-full rounded border p-2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand_id">Brand (opsional)</Label>
          <select id="brand_id" name="brand_id" className="w-full rounded border p-2">
            <option value="">—</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <Button type="submit">Buat Request</Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add new design-request form"
```

---

## Task 4: Board + list page

**Files:**
- Create: `app/(app)/marketing/requests/page.tsx`, `app/(app)/marketing/requests/board.tsx`

**Interfaces:**
- Consumes: `listRequests`, `STATUSES`, `STATUS_LABELS`, `deadlineState`, `updateStatus`.
- Produces: page renders a status board; each card has a status dropdown that calls `updateStatus`.

- [ ] **Step 1: Create the board client component — `app/(app)/marketing/requests/board.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  STATUSES, STATUS_LABELS, deadlineState, type DesignRequest, type DesignStatus,
} from "@/lib/marketing/requests";
import { updateStatus } from "./actions";
import { Card } from "@/components/ui/card";

const today = () => new Date().toISOString().slice(0, 10);

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const state = deadlineState(deadline, today());
  if (state === "none") return null;
  const cls =
    state === "overdue" ? "text-red-600"
    : state === "soon" ? "text-amber-600"
    : "text-muted-foreground";
  return <span className={`text-xs ${cls}`}>⏰ {deadline}</span>;
}

export function Board({ requests }: { requests: DesignRequest[] }) {
  const [, start] = useTransition();
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {STATUSES.map((status) => (
        <div key={status} className="space-y-2">
          <h2 className="text-sm font-medium">{STATUS_LABELS[status]}</h2>
          {requests.filter((r) => r.status === status).map((r) => (
            <Card key={r.id} className="space-y-1 p-3">
              <Link href={`/marketing/requests/${r.id}`} className="text-sm font-medium hover:underline">
                {r.title}
              </Link>
              <p className="text-xs text-muted-foreground">{r.asset_type}</p>
              <DeadlineBadge deadline={r.deadline} />
              <select
                value={r.status}
                onChange={(e) => start(() => updateStatus(r.id, e.target.value as DesignStatus))}
                className="mt-1 w-full rounded border p-1 text-xs"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the page — `app/(app)/marketing/requests/page.tsx`**

```tsx
import Link from "next/link";
import { listRequests } from "@/lib/marketing/requests";
import { Board } from "./board";
import { Button } from "@/components/ui/button";

export default async function RequestsPage() {
  const requests = await listRequests();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Request Desain</h1>
        <Button asChild><Link href="/marketing/requests/new">+ Request Baru</Link></Button>
      </div>
      <Board requests={requests} />
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in, go to `/marketing/requests`, create a request, then change its status via the dropdown.
Expected: card moves to the new status column; deadline badge colors by urgency.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add design-request board with status changes"
```

---

## Task 5: Detail page (status + result link)

**Files:**
- Create: `app/(app)/marketing/requests/[id]/page.tsx`, `app/(app)/marketing/requests/[id]/result-form.tsx`

**Interfaces:**
- Consumes: `getRequest`, `STATUS_LABELS`, `setResultLink`.

- [ ] **Step 1: Create the result-link form — `app/(app)/marketing/requests/[id]/result-form.tsx`**

```tsx
import { setResultLink } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResultForm({ id, current }: { id: string; current: string | null }) {
  async function action(formData: FormData) {
    "use server";
    await setResultLink(id, String(formData.get("link") ?? ""));
  }
  return (
    <form action={action} className="flex gap-2">
      <Input name="link" type="url" placeholder="https://…" defaultValue={current ?? ""} />
      <Button type="submit">Simpan Link</Button>
    </form>
  );
}
```

- [ ] **Step 2: Create the detail page — `app/(app)/marketing/requests/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getRequest, STATUS_LABELS } from "@/lib/marketing/requests";
import { ResultForm } from "./result-form";
import { Card } from "@/components/ui/card";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const req = await getRequest(id);
  if (!req) notFound();

  return (
    <Card className="max-w-lg space-y-3 p-6">
      <h1 className="text-xl font-semibold">{req.title}</h1>
      <p className="text-sm text-muted-foreground">{req.asset_type}</p>
      <p className="text-sm">Status: <b>{STATUS_LABELS[req.status]}</b></p>
      {req.deadline && <p className="text-sm">Deadline: {req.deadline}</p>}
      {req.brief && <p className="whitespace-pre-wrap text-sm">{req.brief}</p>}
      <div className="space-y-1">
        <p className="text-sm font-medium">Link Hasil</p>
        {req.result_link && (
          <a href={req.result_link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
            {req.result_link}
          </a>
        )}
        <ResultForm id={req.id} current={req.result_link} />
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open a request detail page, paste a Google Drive link, save.
Expected: link appears as a clickable link; an invalid (non-http) value is rejected with an error.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass (parsers, analytics, marketing).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add request detail page with result link"
```

---

## Self-Review

**Spec coverage (Plan 4 portion):**
- Statuses Baru→Dikerjakan→Review→Revisi→Selesai → Task 1 `STATUSES` + enum (Plan 1). ✓
- Create form: asset type, title/brief, deadline, optional brand → Task 3. ✓
- Board view + status change → Task 4. ✓
- Detail + status + result link (URL-validated) → Tasks 2,5. ✓
- Deadline urgency highlight → Tasks 1,4. ✓
- `requested_by` auto-set → Task 2. ✓
- No attachments (link only) → respected throughout. ✓

**Placeholder scan:** No TBD/TODO; every step has concrete code/commands. ✓

**Type consistency:** `DesignStatus`, `DesignRequest`, `STATUSES`, `STATUS_LABELS`, `ASSET_TYPES`, `validateRequestInput`, `isValidUrl`, `deadlineState` all defined in Task 1 and consumed unchanged in Tasks 2–5. `listRequests`/`getRequest` (Task 1) used in Tasks 4,5. `Brand`/`listBrands` from Plan 1. ✓

> Deferred from spec (documented): list/table toggle view (board delivered; table is a thin addition later), status-change history log, and the proactive marketing calendar/kanban (explicit future vision in the spec).
