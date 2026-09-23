## Proyek: Factory Maintenance Request Log System
**Klien / Penguji**: PT. Hirose Electric Indonesia  
**Posisi**: Technical Take-Home Test — Full Stack Engineer  
**Teknologi Backend Terpilih**: Hono (TypeScript)  
**Database**: PostgreSQL  
**Frontend**: Vue 3 / Nuxt  
**Batas Waktu**: 24 September 2026, 10:00 WIB  

---

## 1. Pendahuluan & Latar Belakang Bisnis

### 1.1 Latar Belakang
Di lingkungan manufaktur presisi seperti PT. Hirose Electric Indonesia, kelancaran operasional lini produksi sangat bergantung pada kesiapan mesin dan aset pabrik. Ketika terjadi gangguan (*machine breakdown* atau kendala operasional), pelaporan yang cepat, transparan, dan terstruktur sangat dibutuhkan agar tim terkait dapat segera mengambil tindakan penanganan.

### 1.2 Tujuan Proyek
Membangun aplikasi web internal **Maintenance Request Log** yang berfungsi sebagai sistem terpusat untuk:
1. Memfasilitasi **Operator** dalam mencatat dan melaporkan kendala mesin secara real-time.
2. Memberikan wewenang kepada **Supervisor** untuk meninjau, menyetujui (*Approve*), atau menolak (*Reject*) permohonan perbaikan.
3. Memberikan kendali penuh kepada **Admin** untuk mengelola master data pengguna, status pengguna, serta seluruh arsip permohonan perbaikan.
4. Menerapkan kontrol hak akses berbasis peran (**Role-Based Access Control / RBAC**) yang ditegakkan secara ketat pada sisi server (*server-side enforcement*).

### 1.3 Prinsip Rekayasa (Engineering Philosophy)
> [!IMPORTANT]
> *"A smaller, well-built submission scores higher than a feature-complete but messy one."*  
> Fokus utama adalah **kualitas arsitektur, kerapian kode, ketegasan penegakan RBAC di level API, kemudahan deployment via Docker, serta kesiapan live code walkthrough saat wawancara.**

---

## 2. Ruang Lingkup Proyek (Scope of Work)

### 2.1 Fitur Inti (Core Scope - Wajib)
- **Modul Autentikasi**: Login dan Logout aman dengan penanganan token/session yang terjustifikasi.
- **Modul Pengguna (User Management)**: CRUD dan deaktivasi pengguna khusus untuk peran Admin.
- **Modul Maintenance Request**: CRUD lengkap dengan alur status (`Submitted`, `Approved`, `Rejected`).
- **Master Data Mesin (Read-Only via Seeder)**:
  - Menyediakan data master mesin terdaftar beserta informasi lokasinya (*location*).
  - Bersifat **murni read-only** melalui inisialisasi data seeder dan endpoint `GET /api/machines` untuk mengisi dropdown UI form pelaporan.
  - *Catatan Desain*: Desain tabel ini menyertakan `updated_at` sehingga ramah untuk arsitektur masa depan (*future sync* berbasis perbandingan `updated_at > last_sync` dengan sistem master/ERP eksternal) tanpa menambah beban fitur CRUD yang tidak diminta saat ini.
- **Server-Side Input Validation**: Validasi skema input request secara ketat di backend menggunakan Zod.
- **Seed Data Otomatis**: Penyediaan akun percontohan untuk setiap role, data master mesin awal beserta lokasi, dan beberapa data request awal.
- **Orkestrasi Docker**: Menjalankan seluruh sistem (Backend, Frontend, Database) hanya dengan satu perintah `docker compose up`.
- **Pipeline CI**: File `Jenkinsfile` di root repositori dengan penjelasan komprehensif pada `README.md`.

### 2.2 Fitur Nilai Tambah Terpilih (Selected Baseline & Bonus Tasks)
Berdasarkan kebutuhan operasional standar industri modern, proyek ini mengintegrasikan 4 poin fungsional dasar:
1. **[Tugas Opsional 2] Pagination & Server-Side Search**:
   - Mendukung penanganan data berskala besar (ribuan baris data seeder) dengan paginasi efisien (`limit`, `page`/`offset`) dan pencarian multi-kolom (`machine_id`, `problem_description`).
2. **[Tugas Opsional 4] Health Check Endpoint & Structured Logging**:
   - Endpoint `/health` untuk monitoring kesiapan service (liveness/readiness probe) yang terhubung pada healthcheck Docker Compose.
   - Structured logging berbasis JSON (menggunakan format log terstandar) untuk kemudahan audit dan tracing error.
3. **[Tugas Opsional 5] OpenAPI / Swagger Documentation**:
   - Dokumentasi API interaktif yang digenerate otomatis menggunakan `@hono/zod-openapi`, menyatukan validasi runtime dengan kontrak API publik tanpa duplikasi kode.
4. **[Tugas Opsional 6] Meaningful Automated Tests (RBAC Verification)**:
   - Pengujian otomatis (menggunakan Vitest) yang secara spesifik membuktikan kepatuhan terhadap Matriks Hak Akses (RBAC) pada setiap endpoint API.

> [!NOTE]
> Ketentuan evaluator menyebutkan *"Pick at most one or two that interest you"*. Pada `README.md`, sorotan utama tugas bonus akan difokuskan pada **Meaningful Automated Tests (Matriks RBAC)** dan **OpenAPI Documentation**, sedangkan *Health Check* dan *Pagination* diposisikan sebagai standar arsitektur profesional (*baseline engineering standard*).

---

## 3. Pengguna & Matriks Hak Akses (RBAC Specification)

### 3.1 Profil Pengguna (User Personas)
1. **Operator**: Staf lini produksi yang menemukan kendala mesin di lapangan.
2. **Supervisor**: Pimpinan tim teknis yang berhak memvalidasi urgensi dan menyetujui jadwal perbaikan.
3. **Admin**: Pengelola sistem IT/Maintenance yang bertanggung jawab atas akun pengguna dan integritas data keseluruhan.

### 3.2 Matriks Hak Akses Server-Side
Semua aturan hak akses pada tabel di bawah ini **wajib divalidasi langsung oleh middleware backend (Hono)**:

| Aksi / Fungsi | Operator | Supervisor | Admin | Aturan Bisnis & Validasi Backend |
| :--- | :---: | :---: | :---: | :--- |
| **Get Machines List** (Dropdown Mesin) | ✅ | ✅ | ✅ | Seluruh role yang login dapat melihat daftar master mesin untuk pelaporan/filter. |
| **Create a request** | ✅ | ✅ | ✅ | Status awal otomatis `Submitted`, `created_by` terkunci ke ID user yang login. |
| **View own requests** | ✅ | ✅ | ✅ | Query dibatasi hanya record dengan `created_by = current_user.id`. |
| **View all requests** | ❌ | ✅ | ✅ | Operator ditolak dengan respons `403 Forbidden` jika mencoba melihat request user lain. |
| **Edit own request** (status `Submitted`) | ✅ | ✅ | ✅ | Hanya diizinkan jika status masih `Submitted` dan record milik user terkait. |
| **Edit any request** | ❌ | ❌ | ✅ | Admin dapat mengedit detail request milik siapa pun dan pada status apa pun. |
| **Approve / Reject request** | ❌ | ✅ | ✅ | Mengubah status menjadi `Approved` atau `Rejected`. Wajib mengisi `reviewed_by` dan `reviewed_at`. Operator ditolak (`403`). |
| **Delete a request** | ❌ | ❌ | ✅ | Hanya Admin yang berhak menghapus record request. |
| **Manage users** (Create/Edit/Deactivate) | ❌ | ❌ | ✅ | Hanya Admin. Akun user yang berstatus nonaktif (`is_active = false`) ditolak saat login. |

---

## 4. Kebutuhan Fungsional (Functional Requirements)

### 4.1 Modul Autentikasi (AUTH)
- **FR-AUTH-01**: Pengguna dapat melakukan login menggunakan identitas login (Username/Email) dan Password.
- **FR-AUTH-02**: Sistem memverifikasi password menggunakan hashing yang aman (Argon2id atau Bcrypt).
- **FR-AUTH-03**: Sistem menolak login pengguna yang memiliki status nonaktif (`is_active: false`).
- **FR-AUTH-04**: Sistem menerbitkan token autentikasi (JWT / Session Cookie) dengan masa berlaku terukur.
- **FR-AUTH-05**: Pengguna dapat melakukan logout yang membatalkan sesi di browser.
- **FR-AUTH-06**: Terdapat endpoint profil (`/auth/me`) untuk mengambil data pengguna yang sedang login beserta role-nya.

### 4.2 Modul Master Mesin (MCH - Read-Only Helper)
- **FR-MCH-01**: Menyediakan endpoint `GET /api/machines` yang mengembalikan daftar mesin aktif (`id`, `code`, `name`, `location`).
- **FR-MCH-02**: Endpoint ini digunakan oleh frontend untuk merender opsi dropdown pada form pembuatan request serta filter pencarian.
- **FR-MCH-03**: Data master mesin dipasok secara otomatis melalui Database Seeder tanpa memerlukan modul CRUD UI manual.

### 4.3 Modul Maintenance Request (REQ)
- **FR-REQ-01**: Pengguna terautentikasi dapat membuat request baru dengan atribut:
  - `machine_id` (Foreign Key mengacu pada `machines.id`, Wajib)
  - `problem_description` (Deskripsi Kendala, Text, Wajib)
  - `priority` (Urgensi: `Low`, `Medium`, `High`, `Critical`, Wajib)
- **FR-REQ-02**: Sistem otomatis mencatat metadata pembuatan:
  - `status`: Default bernilai `Submitted`
  - `created_by`: ID user saat ini
  - `created_at`: Timestamp saat request disimpan
- **FR-REQ-03**: Pengguna dapat melihat daftar request:
  - Operator: Hanya melihat request buatannya sendiri.
  - Supervisor & Admin: Melihat seluruh request yang ada di sistem.
- **FR-REQ-04**: Pengguna dapat memfilter daftar request berdasarkan:
  - `status` (`Submitted`, `Approved`, `Rejected`)
  - `priority` (`Low`, `Medium`, `High`, `Critical`)
  - `machine_id` (Filter opsional berdasarkan ID mesin tertentu)
- **FR-REQ-05 (Bonus #2)**: Sistem menyediakan paginasi dan pencarian server-side:
  - Parameter query: `page`, `limit`, `search` (mencari pada kode/nama mesin dan `problem_description`).
  - Respons menyertakan metadata: `total_records`, `current_page`, `total_pages`.
- **FR-REQ-06**: Pengguna dapat memperbarui request miliknya selama statusnya masih `Submitted`.
- **FR-REQ-07**: Supervisor dan Admin dapat melakukan approval review:
  - Input: Tindakan (`Approved` atau `Rejected`) dan catatan peninjau (`reviewer_notes`).
  - Sistem otomatis merekam `reviewed_by = current_user.id` dan `reviewed_at = NOW()`.
- **FR-REQ-08**: Admin dapat mengedit dan menghapus request apa pun.

### 4.4 Modul Manajemen Pengguna (USER - Khusus Admin)
- **FR-USR-01**: Admin dapat melihat daftar seluruh pengguna yang terdaftar di sistem.
- **FR-USR-02**: Admin dapat membuat pengguna baru dengan mendefinisikan `username`, `email`, `role`, dan `initial_password`.
- **FR-USR-03**: Admin dapat memperbarui profil atau role pengguna lain.
- **FR-USR-04**: Admin dapat mengaktifkan atau menonaktifkan pengguna (*Soft Deactivation* via `is_active = false`).

### 4.5 Modul Dokumentasi & Observability (OPS - Bonus #4 & #5)
- **FR-OPS-01 (Bonus #4)**: Endpoint `GET /health` mengembalikan status kesehatan aplikasi backend dan konektivitas database PostgreSQL.
- **FR-OPS-02 (Bonus #4)**: Seluruh log HTTP request dan error dicetak dalam format terstruktur (JSON structured logs) yang memuat `timestamp`, `level`, `method`, `path`, `status_code`, dan `latency`.
- **FR-OPS-03 (Bonus #5)**: Endpoint `GET /docs` atau `GET /swagger` menyajikan antarmuka OpenAPI interaktif (Swagger UI) yang mendokumentasikan seluruh endpoint, skema request/response, dan parameter otorisasi.

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 5.1 Keamanan (Security)
- **NFR-SEC-01**: Tidak ada password yang disimpan dalam format teks polos (*plain text*). Wajib menggunakan algoritma hashing standar industri (Argon2id atau Bcrypt).
- **NFR-SEC-02**: Seluruh payload yang masuk ke API divalidasi dan disanitasi menggunakan skema Zod di sisi server untuk mencegah serangan injection dan format data cacat.
- **NFR-SEC-03**: Seluruh endpoint terlindungi memverifikasi token JWT / Session di lapisan middleware sebelum request mencapai layer controller/service.
- **NFR-SEC-04**: Penanganan CORS yang tepat untuk membatasi pemanggilan API hanya dari domain frontend yang sah.

### 5.2 Performa & Skalabilitas (Performance)
- **NFR-PERF-01**: Query daftar request dioptimalkan dengan indexing pada kolom-kolom kunci: `created_by`, `status`, `priority`, dan `machine_id`.
- **NFR-PERF-02**: Paginasi data di backend memastikan bahwa query tidak meload seluruh baris data sekaligus, sehingga tetap responsif saat tabel memiliki ribuan record data seeder.

### 5.3 Keandalan & Pengujian (Quality & Testing - Bonus #6)
- **NFR-TEST-01**: Pengujian otomatis (Unit & Integration Tests) mencakup cakupan skenario Matriks Hak Akses (RBAC):
  - Membuktikan Operator diblokir saat mengakses daftar global (`403`).
  - Membuktikan Operator diblokir saat mencoba approve/reject (`403`).
  - Membuktikan Operator diblokir saat mengedit request yang sudah berstatus `Approved`/`Rejected` (`403`).
  - Membuktikan Supervisor berhasil approve/reject.
  - Membuktikan Admin dapat melakukan seluruh aksi termasuk delete request dan deactivate user.

### 5.4 Kemudahan Deployment & Operasional (DevOps)
- **NFR-OPS-01**: Aplikasi dapat dijalankan dari repositori hasil *clean clone* hanya dengan langkah:
  1. `cp .env.example .env`
  2. `docker compose up --build`
- **NFR-OPS-02**: Container PostgreSQL otomatis menjalankan inisialisasi skema (migration) dan seeder data awal saat pertama kali container dijalankan.
- **NFR-OPS-03**: File `Jenkinsfile` di root repositori mendefinisikan tahapan:
  1. *Checkout SCM*
  2. *Install Dependencies*
  3. *Lint & Code Analysis*
  4. *Run Automated Tests (RBAC Matrix)*
  5. *Build Docker Images*

---

## 6. Model Data Konseptual

```
+-------------------------------------------------------+
|                         ROLES                         |
+-------------------------------------------------------+
| id             : BIGSERIAL / INT (PK)                 |
| name           : VARCHAR(50) (UNIQUE)                 |
| description    : TEXT (NULLABLE)                      |
| created_at     : TIMESTAMP WITH TIME ZONE             |
| updated_at     : TIMESTAMP WITH TIME ZONE             |
+-------------------------------------------------------+
        |                               ^
        | 1:N                           | N:1
        v                               |
+-----------------------+       +-------------------------------+
|   ROLE_PERMISSIONS    |       |             USERS             |
+-----------------------+       +-------------------------------+
| role_id       : FK    |       | id            : BIGSERIAL PK  |
| permission_id : FK    |       | username      : VARCHAR(50) UK|
| (PK composite)        |       | email         : VARCHAR(100)UK|
+-----------------------+       | password_hash : VARCHAR(255)  |
        ^                       | role_id       : FK -> ROLES.id|
        | N:1                   | is_active     : BOOLEAN (TRUE)|
+-----------------------+       | created_at    : TIMESTAMPTZ   |
|      PERMISSIONS      |       | updated_at    : TIMESTAMPTZ   |
+-----------------------+       +-------------------------------+
| id          : INT PK  |                       |
| name        : VARCHAR |                       | 1:N (created & reviewed)
| description : TEXT    |                       v
| created_at  : TZ      |       +-------------------------------+
| updated_at  : TZ      |       |     MAINTENANCE_REQUESTS      |
+-----------------------+       +-------------------------------+
                                | id                  : BIGSERIAL PK
                                | machine_id          : FK -> MACHINES
                                | problem_description : TEXT
                                | priority            : ENUM
                                | status              : ENUM
                                | created_by          : FK -> USERS
                                | created_at          : TIMESTAMPTZ
                                | reviewed_by         : FK -> USERS
                                | reviewed_at         : TIMESTAMPTZ
                                | reviewer_notes      : TEXT
                                | updated_at          : TIMESTAMPTZ
                                +-------------------------------+
                                                ^
                                                | N:1
                                +-------------------------------+
                                |           MACHINES            |
                                | (Read-Only Master via Seeder) |
                                +-------------------------------+
                                | id         : BIGSERIAL (PK)   |
                                | code       : VARCHAR(50) (UQ) |
                                | name       : VARCHAR(100)     |
                                | location   : VARCHAR(100)     |
                                | is_active  : BOOLEAN (TRUE)   |
                                | created_at : TIMESTAMPTZ      |
                                | updated_at : TIMESTAMPTZ      |
                                +-------------------------------+
```

---

## 7. Data Seeder Awal (Initial Seed Data)

Sistem wajib menyediakan seeder yang langsung aktif saat `docker compose up`:

### 7.0 Master Roles & Permissions (Read-Only Relational RBAC)
Struktur hak akses berbasis relasional database (read-only dari sistem, tanpa modul CRUD frontend) disiapkan untuk skalabilitas masa depan dan pembuktian desain arsitektur saat evaluasi wawancara teknis:
- **Daftar Roles**: `Operator`, `Supervisor`, `Admin`.
- **Daftar Permissions**:
  - `machines:read`: Melihat daftar master mesin & lokasi pabrik
  - `requests:create`: Membuat laporan kendala mesin baru
  - `requests:read_own`: Melihat daftar permohonan milik sendiri
  - `requests:read_all`: Melihat seluruh permohonan dalam sistem
  - `requests:update_own`: Memperbarui rincian kendala milik sendiri (status `Submitted`)
  - `requests:update_any`: Mengedit data request milik siapa pun pada status apa pun (khusus Admin)
  - `requests:review`: Menyetujui (*Approve*) atau Menolak (*Reject*) request (Supervisor & Admin)
  - `requests:delete`: Menghapus arsip tiket perbaikan (khusus Admin)
  - `users:manage`: Mengelola akun pengguna dan deaktivasi (khusus Admin)
- **Pemetaan Hak Akses (Role-Permission Matrix)**:
  - **Operator**: `machines:read`, `requests:create`, `requests:read_own`, `requests:update_own`
  - **Supervisor**: `machines:read`, `requests:create`, `requests:read_own`, `requests:read_all`, `requests:review`
  - **Admin**: Seluruh permissions di atas (penuh)

### 7.1 Akun Pengguna (Users)
| Role | Username / Identity | Default Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Operator** | `operator1` | `Password123!` | Digunakan untuk menguji pelaporan kerusakan & filter request milik sendiri (terhubung ke role_id Operator) |
| **Supervisor** | `supervisor1` | `Password123!` | Digunakan untuk menguji melihat semua request & aksi approve/reject (terhubung ke role_id Supervisor) |
| **Admin** | `admin1` | `Password123!` | Digunakan untuk menguji manajemen user, edit request, dan hapus request (terhubung ke role_id Admin) |
| **Operator (Deactivated)** | `inactive_user` | `Password123!` | Digunakan untuk memverifikasi penolakan login akun nonaktif (`is_active = false`, US-AUTH-02) |

### 7.2 Master Mesin & Lokasi Pabrik (Machines)
| Kode Mesin (`code`) | Nama Mesin (`name`) | Lokasi Pabrik (`location`) |
| :--- | :--- | :--- |
| `MCH-STAMP-01` | High Speed Stamping Press 01 | Building A - Stamping Line 1 |
| `MCH-STAMP-02` | Precision Stamping Press 02 | Building A - Stamping Line 2 |
| `MCH-MOLD-01` | Precision Plastic Injection Molding 01 | Building B - Molding Hall 1 |
| `MCH-MOLD-02` | Micro Connector Injection Molding 02 | Building B - Molding Hall 2 |
| `MCH-PLAT-01` | Continuous Gold/Tin Plating Line 01 | Building C - Surface Finishing |
| `MCH-ASSY-01` | Automated Connector Pin Assembly 01 | Building A - Final Assembly Area |
| `MCH-ASSY-02` | High-Speed Optical Inspection & Pack 02| Building A - Packaging Area |

*Catatan: Seeder juga mencakup record sampel request (campuran status `Submitted`, `Approved`, `Rejected` dengan variasi prioritas) serta batch data percontohan untuk membuktikan performa paginasi & pencarian.*

---

## 8. Kriteria Penerimaan (Acceptance Criteria / Definition of Done)

Proyek dinyatakan selesai dan siap diserahkan apabila:
- [ ] Backend Hono (TypeScript) dan Frontend Vue 3/Nuxt berjalan lancar dan terhubung ke PostgreSQL via Docker Compose tanpa intervensi manual.
- [ ] Master data mesin dan lokasinya ter-seed otomatis dan dapat diakses via `GET /api/machines` untuk pilihan dropdown form pelaporan.
- [ ] Pengujian manual dan otomatis membuktikan bahwa **seluruh aturan Matriks Hak Akses (RBAC)** ditegakkan di sisi API.
- [ ] Seluruh input API tervalidasi di sisi server (Zod) dan password tersimpan dengan hashing aman.
- [ ] Dokumentasi Swagger UI interaktif dapat diakses pada browser di endpoint `/docs`.
- [ ] Endpoint `/health` merespons status `200 OK` dan log sistem tercetak dalam format terstruktur.
- [ ] Daftar request mendukung paginasi dan pencarian multi-kolom yang responsif.
- [ ] Script tes otomatis (Vitest) berhasil dijalankan dan semua pengujian berstatus `PASS`.
- [ ] Repositori Git publik memiliki riwayat commit bertahap (bukan single squashed commit).
- [ ] `README.md` memuat seluruh petunjuk instalasi, akun login seeder, arsitektur, penjelasan stage `Jenkinsfile`, serta bagian wajib **AI Disclosure**.
