# Sales & Marketing Dashboard — Design Spec

**Date:** 2026-06-28
**Status:** Approved (design), pending implementation plan

## 1. Ringkasan

Web app internal untuk dua tim:

- **Tim Sales** — dashboard analytics & report. Sumber data: raw export Shopee (Excel/CSV) yang di-upload per periode, lalu diproses dan ditampilkan sebagai analitik dengan perbandingan antar periode.
- **Tim Marketing** — task tracker untuk request aset kreatif (banner toko, flyer ads, IG story, dll). Sales membuat request, marketing mengerjakan dan melacak statusnya.

Pengguna: ±7 orang (1 SPV/Admin, 4 Sales, 2 Marketing). Semua login.

**Scope tahap awal:** Shopee saja. TikTok disiapkan strukturnya tapi belum dibangun.

## 2. Tech Stack

- **Next.js (App Router) + TypeScript** — frontend & backend (server actions / route handlers).
- **Tailwind CSS + shadcn/ui** — komponen UI.
- **Supabase** — Postgres (data), Auth (login email/password), opsional Storage.
- **Recharts** (via shadcn charts) — grafik.
- **SheetJS (xlsx)** — parsing file Excel/CSV.
- **Vitest** — testing.
- **Deploy:** Vercel (app) + Supabase (DB & Auth).

## 3. Arsitektur & Struktur

### Rute
```
/login                     → halaman login
/  (dashboard)             → ringkasan utama (default setelah login)
/sales/upload              → upload raw data Shopee (Global / Ads / Produk)
/sales/dashboard           → analytics & report (filter periode + perbandingan)
/marketing/requests        → task tracker creative (board + list)
/marketing/requests/new    → buat request desain baru
/admin/users               → (Admin) kelola akun pengguna [opsional tahap awal]
```

### Pembagian tanggung jawab (modular, mudah diuji)
- **`lib/parsers/`** — baca & petakan kolom file Shopee → data terstruktur. Logika murni.
- **`lib/analytics/`** — agregasi & hitung perbandingan antar periode (% naik/turun). Logika murni.
- **`lib/supabase/`** — koneksi & query database.
- **Komponen UI** — terpisah dari logika di atas; hanya menampilkan.

### Autentikasi & Role
- Login email/password lewat Supabase Auth.
- Tabel `profiles` menyimpan `role` (`admin` / `sales` / `marketing`).
- **Tahap awal:** semua user yang login bisa akses semua fitur. Role disimpan agar pembatasan akses (RBAC) bisa diaktifkan nanti tanpa ubah struktur.
- Akun dibuat oleh Admin (SPV).

## 4. Sumber Data Asli (hasil inspeksi file Shopee)

Ketiga file adalah **ringkasan satu periode** (contoh: 01–27 Juni 2026), namun file Global juga memuat **rincian harian**.

### 4.1 `shop-stats.xlsx` (Data Global) — 12 sheet
- **`Pesanan Dibuat` / `Pesanan Siap Dikirim` / `Pesanan Dibayar`** — masing-masing: 1 baris total periode + **rincian per tanggal**. Kolom: Tanggal, Total Penjualan (IDR), Total Pesanan, Penjualan per Pesanan, Produk Diklik, Total Pengunjung, Tingkat Konversi Pesanan, Pesanan Dibatalkan.
- 9 sheet lain: breakdown **Asal Kunjungan / Asal Penjualan / Kontribusi** (sumber traffic & penjualan: Halaman Produk, Live, Video, Affiliate, Iklan Shopee).

### 4.2 `parentskudetail.xlsx` (Performa Produk) — 40 kolom
Per produk **dan per variasi/SKU** (warna, dll): penjualan (pesanan dibuat & siap dikirim), dilihat, diklik, %klik, konversi, pesanan, pembeli, keranjang, repeat order, dll.

### 4.3 `...Iklan....csv` (Data Ads)
Per **iklan / Grup Iklan** (bukan harian). Ada baris metadata di atas (username, nama toko, periode) sebelum header tabel. Kolom: Nama Iklan, Status, Jenis Iklan, Dilihat, Jumlah Klik, Persentase Klik (CTR), Add to Cart, Konversi, Tingkat konversi (CVR), Biaya per Konversi, Produk Terjual, Omzet Penjualan, Biaya, Efektifitas Iklan (ROAS), ACOS, Voucher, dll.

### Catatan parsing penting
- **Format angka berbeda per file.** XLSX = format Indonesia (`163.133.332` = 163 juta; desimal koma `16,06%`, `80.315,80`). Ads CSV = format mentah (`134079`; desimal titik `4.33%`, `2373.96`).
- File punya **baris metadata** di atas tabel, dan Global punya **2 tabel dalam 1 sheet** + total periode di baris pertama tiap sheet harian.
- Nilai `-` atau kosong → `null` (bukan `0`).
- Header dicari berdasarkan **nama kolom**, bukan posisi (Shopee bisa mengubah urutan/menambah kolom).

## 5. Model Data

Dimensi **brand** (toko) hadir di seluruh data — app mengelola lebih dari satu brand.

- **`brands`** — daftar brand/toko (nama konsisten). `id, name, created_at`.
- **`profiles`** — `id (FK auth.users), full_name, role`.
- **`report_periods`** (induk tiap upload) — `id, brand_id, platform, period_start, period_end, uploaded_by, created_at`.
- **`global_daily`** — per periode, **per tanggal**, per status pesanan (`dibuat`/`siap_dikirim`/`dibayar`): `period_id, date, order_status, total_penjualan, total_pesanan, penjualan_per_pesanan, produk_diklik, total_pengunjung, konversi, pesanan_dibatalkan`. → sumber grafik tren harian.
- **`global_source`** — per periode: breakdown penjualan & kunjungan per sumber (Halaman Produk, Live, Video, Affiliate, Iklan Shopee). → grafik komposisi.
- **`product_summary`** — per periode, per produk: `period_id, kode_produk, product_name, penjualan, dilihat, diklik, total_pesanan, persentase_klik, konversi, total_pembeli, extra jsonb`.
- **`product_detail`** — per periode, per produk + variasi/SKU: kolom inti (kode_produk, kode_variasi, nama_variasi, sku_induk, penjualan, dilihat, klik, konversi, keranjang, repeat order) + sisanya ke `extra jsonb`.
- **`ads_summary`** — per periode, per iklan: `period_id, nama_iklan, status, jenis_iklan, dilihat, klik, ctr, add_to_cart, konversi, cvr, biaya_per_konversi, produk_terjual, omzet, biaya, roas, acos, voucher, extra jsonb`.
- **`design_requests`** — `id, brand_id (opsional), asset_type, title, brief, deadline, status, result_link, requested_by, created_at, updated_at`. `status` ∈ `baru / dikerjakan / review / revisi / selesai`.

**Dedupe:** upload ulang untuk (brand, platform, periode) yang sama akan **menimpa** (replace) data periode itu, bukan menggandakan.

**Perbandingan %:** tren harian dari `global_daily`; naik/turun antar periode = agregasi periode A vs periode B (total toko, per produk, per iklan).

## 6. Modul Sales

### 6.1 Upload (`/sales/upload`)
1. **Pilih Brand** dari dropdown (managed list, untuk konsistensi nama). Ada tombol "+ Tambah brand".
2. **Tarik file** (drag & drop): Global, Produk, Ads. Sistem mengenali jenis tiap file dari isinya (urutan bebas). Tidak wajib ketiganya sekaligus.
3. **Periode otomatis** — dibaca dari isi/nama file (mis. `01-06-2026-27-06-2026`). Bila gagal terbaca, minta konfirmasi manual sebagai cadangan.
4. **Preview & konfirmasi** — ringkasan hasil parsing (X hari data global, Y produk, Z iklan, total omzet). Cek dulu, lalu **Simpan**.
5. **Simpan** — parsing di server (server action). Periode yang sudah ada → konfirmasi lalu replace.

### 6.2 Dashboard (`/sales/dashboard`)
**Kontrol atas:**
- Filter **Brand**.
- **Pemilih periode** (pilih periode yang sudah diupload, atau rentang tanggal di dalam periode).
- **Pembanding**: periode sebelumnya (otomatis) atau manual → angka utama dapat badge ▲/▼ %.
- **Toggle status pesanan**: Dibuat / Siap Dikirim / Dibayar (default: Dibuat).
- (Disiapkan) filter platform — Shopee aktif, siap nambah TikTok.

**Isi (urut atas→bawah):**
1. **Kartu KPI** dengan Δ% vs pembanding: Omzet, Total Pesanan, Pengunjung, Konversi, Penjualan/Pesanan, (opsional) Pesanan Dibatalkan.
2. **Grafik tren harian** (line/area) — omzet & pesanan per tanggal; garis pembanding periode lalu opsional.
3. **Komposisi sumber penjualan** (donut/bar) — Halaman Produk / Live / Video / Affiliate / Iklan Shopee.
4. **Tabel Produk Terlaris** — sortir & cari; omzet, terjual, konversi + Δ%; klik produk → detail variasi.
5. **Panel Ads** — KPI iklan (biaya, omzet iklan, ROAS, ACOS, CTR, CVR) + tabel per iklan dengan Δ%.

**Ekspor:** tombol export tabel ke CSV/Excel. Print-friendly view opsional.

## 7. Modul Marketing (Task Tracker)

### 7.1 Daftar Request (`/marketing/requests`)
- **Board berbasis status**: `Baru → Dikerjakan → Review → Revisi → Selesai` (geser kartu / ganti status via dropdown).
- **Toggle tabel/list** (sortir deadline, filter status, cari judul).
- **Filter**: status, brand (opsional), pembuat.
- Penanda **deadline mepet/lewat** (warna).

### 7.2 Buat Request (`/marketing/requests/new`)
- **Jenis aset** (dropdown: Banner Toko, Flyer Ads, IG Story, … bisa ditambah).
- **Judul / Brief** (teks).
- **Deadline** (tanggal).
- (opsional) **Brand** terkait.
- Pembuat & waktu dibuat otomatis dari user login.

### 7.3 Detail Request
- Lihat info + **ubah status**.
- **Tempel link hasil** (Google Drive / Canva / Figma) — divalidasi sebagai URL.
- (opsional, jika gampang) riwayat perubahan status (siapa, kapan).

Field referensi/lampiran **belum** dibuat (simpel dulu).

## 8. Penanganan Error

**Upload:**
- File tak dikenali → pesan jelas ("bukan export Shopee yang didukung").
- Kolom inti hilang/berubah → peringatan + daftar kolom hilang; jangan simpan diam-diam.
- Dua format angka (ID vs mentah) ditangani; `-`/kosong → `null`.
- Periode tak terbaca → konfirmasi manual.
- Upload ulang periode sama → konfirmasi sebelum replace.
- Selalu ada **preview sebelum simpan**.

**Umum:**
- Gagal koneksi DB/Supabase → pesan ramah + tombol coba lagi.
- Form (request, link) → validasi klien & server.
- Akses tanpa login → redirect ke `/login`.

## 9. Strategi Testing (Vitest)

Fokus pada logika murni paling berisiko:
1. **`lib/parsers/`** (prioritas utama) — uji dengan potongan file asli: Global multi-sheet (total + harian), Produk 40-kolom, Ads CSV; cek parsing angka (format ID & mentah), nilai `-`, baris metadata terlewati, header by-name.
2. **`lib/analytics/`** — agregasi & perbandingan % (naik/turun, pembagian nol aman, periode tanpa pembanding).
3. **Smoke test** alur kritis: upload→preview→simpan; buat & pindah status request.

Testing komponen UI secukupnya.

## 10. Out of Scope (YAGNI tahap ini)

Disiapkan strukturnya tapi belum dibangun:
- TikTok (modul kedua platform).
- Dashboard gabungan multi-brand.
- RBAC ketat (pembatasan akses per role).
- Kalender/kanban proaktif marketing (sales menandai campaign + kebutuhan desain).
- Lampiran file pada request.
- Notifikasi / email.
