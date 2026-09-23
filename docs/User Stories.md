> [!NOTE]
> Dokumen ini mendefinisikan seluruh skenario kebutuhan pengguna (*User Stories*) beserta kriteria penerimaan (*Acceptance Criteria* berbasis *Given-When-Then*) untuk aplikasi **Factory Maintenance Request Log**. Seluruh pembatasan hak akses (*RBAC*) didukung oleh skema relasional database (`roles`, `permissions`, `role_permissions`), ditegakkan langsung di level API backend (Hono), dan divalidasi dengan pengujian otomatis (*Vitest*).

---

## 1. Modul Autentikasi & Akun

### US-AUTH-01: Login Pengguna
- **Sebagai**: Pengguna sistem (*Operator*, *Supervisor*, atau *Admin*)
- **Saya ingin**: Melakukan login menggunakan kredensial (Username/Email dan Password)
- **Sehingga**: Saya dapat mengakses fitur aplikasi yang sesuai dengan wewenang peran (*role*) saya.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Login berhasil dengan kredensial yang valid
  Given akun pengguna aktif terdaftar di database
  When pengguna mengirimkan username dan password yang benar ke endpoint "POST /api/auth/login"
  Then sistem merespons dengan status 200 OK
  And sistem mengembalikan token autentikasi (JWT / Session) serta data profil ringkas (id, username, role)
  And frontend mengarahkan pengguna ke halaman dashboard sesuai role

Scenario: Login gagal karena password salah atau username tidak ditemukan
  Given terdapat data login di sistem
  When pengguna mengirimkan username yang tidak terdaftar atau password yang salah
  Then sistem merespons dengan status 401 Unauthorized
  And sistem menampilkan pesan kesalahan umum "Invalid credentials" tanpa membocorkan eksistensi username

Scenario: Validasi input data login di sisi server
  When pengguna mengirimkan payload login dengan format kosong atau tidak valid
  Then backend menolak dengan status 400 Bad Request melalui validasi Zod
```

---

### US-AUTH-02: Pencegahan Login Akun Nonaktif (Deactivated User)
- **Sebagai**: Sistem Keamanan / Administrator
- **Saya ingin**: Mencegah akun yang berstatus nonaktif (`is_active = false`) untuk dapat login
- **Sehingga**: Karyawan yang telah dinonaktifkan tidak dapat menyusup atau mengakses sistem pabrik.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Pengguna dengan status nonaktif mencoba login
  Given akun pengguna ada di database namun memiliki nilai "is_active = false"
  When pengguna mengirimkan username dan password yang benar ke "POST /api/auth/login"
  Then sistem menolak login dengan status 403 Forbidden atau 401 Unauthorized
  And sistem mengembalikan pesan bahwa akun telah dinonaktifkan
  And token sesi tidak diterbitkan
```

---

### US-AUTH-03: Logout & Manajemen Sesi
- **Sebagai**: Pengguna yang sedang login
- **Saya ingin**: Melakukan logout dari aplikasi
- **Sehingga**: Sesi kerja saya berakhir dan perangkat tidak dapat digunakan oleh orang lain tanpa login ulang.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Pengguna melakukan logout
  Given pengguna memiliki sesi login yang aktif
  When pengguna memanggil endpoint "POST /api/auth/logout" atau menekan tombol Logout di antarmuka
  Then token/cookie sesi dibersihkan atau di-invalidate
  And pengguna diarahkan kembali ke halaman Login
  And request selanjutnya ke endpoint terlindungi tanpa token akan ditolak dengan respons 401 Unauthorized
```

---

## 2. Modul Master Mesin (Read-Only Helper)

### US-MCH-01: Melihat Daftar Mesin & Lokasi untuk Pelaporan
- **Sebagai**: Operator atau Pengguna lain yang ingin melaporkan/memfilter request
- **Saya ingin**: Melihat daftar mesin pabrik terdaftar beserta lokasinya dalam bentuk dropdown
- **Sehingga**: Saya dapat memilih mesin yang tepat tanpa risiko salah ketik (*typo*).

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Mengambil daftar mesin aktif
  Given pengguna telah terautentikasi (Operator, Supervisor, atau Admin)
  When pengguna memanggil endpoint "GET /api/machines"
  Then sistem mengembalikan status 200 OK
  And payload berisi daftar mesin (id, code, name, location)
  And frontend menampilkan daftar tersebut pada komponen dropdown/combobox dengan format "code - name (location)"
```

---

## 3. Modul Maintenance Request: Operator

### US-REQ-01: Pelaporan Kendala Mesin Baru (Create Request)
- **Sebagai**: Operator
- **Saya ingin**: Mengajukan permohonan perbaikan mesin dengan memilih mesin, memasukkan deskripsi kendala, dan menentukan prioritas
- **Sehingga**: Tim teknis dan Supervisor mengetahui adanya kerusakan mesin yang perlu segera ditangani.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Operator berhasil membuat request perbaikan
  Given Operator telah login
  When Operator mengirimkan data request baru ("machine_id", "problem_description", "priority") ke "POST /api/requests"
  Then sistem merespons dengan status 201 Created
  And record tersimpan di database dengan status otomatis bernilai "Submitted"
  And field "created_by" otomatis terisi dengan ID Operator yang login
  And field "reviewed_by" dan "reviewed_at" bernilai NULL

Scenario: Validasi data wajib pada pembuatan request
  Given Operator telah login
  When Operator mengirimkan payload dengan field kosong atau prioritas di luar pilihan (Low, Medium, High, Critical)
  Then sistem menolak dengan respons 400 Bad Request disertai detail error validasi Zod
```

---

### US-REQ-02: Melihat Daftar Request Milik Sendiri (View Own Requests)
- **Sebagai**: Operator
- **Saya ingin**: Melihat daftar request perbaikan yang pernah saya buat
- **Sehingga**: Saya dapat memantau perkembangan status tiket saya apakah masih `Submitted`, telah `Approved`, atau `Rejected`.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Operator membuka halaman daftar request
  Given Operator telah login dan memiliki 3 request buatan sendiri di antara total 20 request dalam sistem
  When Operator memanggil endpoint "GET /api/requests"
  Then sistem backend otomatis memfilter query "WHERE created_by = current_user.id"
  And respons 200 OK hanya mengembalikan 3 record milik Operator tersebut
  And Operator TIDAK DAPAT melihat request yang dibuat oleh rekan operator lain
```

---

### US-REQ-03: Mengubah Data Request Sendiri yang Masih Berstatus `Submitted`
- **Sebagai**: Operator
- **Saya ingin**: Mengedit rincian kendala atau prioritas pada request buatan saya selama statusnya masih `Submitted`
- **Sehingga**: Saya dapat memperbaiki informasi yang kurang jelas sebelum ditinjau oleh Supervisor.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Operator berhasil memperbarui request miliknya yang berstatus Submitted
  Given Operator memiliki request buatan sendiri dengan status "Submitted"
  When Operator mengirimkan perubahan data ke "PUT /api/requests/:id"
  Then sistem memvalidasi kepemilikan dan status
  And sistem merespons dengan status 200 OK serta data yang telah diperbarui
```

---

### US-REQ-04: Pembatasan Otorisasi Operator (Security Enforcement)
- **Sebagai**: Sistem Keamanan Aplikasi
- **Saya ingin**: Menolak seluruh upaya Operator yang melanggar batas wewenang di level backend
- **Sehingga**: Operator tidak dapat memanipulasi data di luar hak aksesnya sekalipun memanggil API secara langsung.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Operator mencoba melihat seluruh request tanpa filter kepemilikan
  Given Operator memanggil endpoint "GET /api/requests/all" atau parameter bypass
  Then backend menolak akses dan mengembalikan respons 403 Forbidden

Scenario: Operator mencoba mengedit request miliknya yang SUDAH Approved atau Rejected
  Given Operator memiliki request dengan status "Approved" atau "Rejected"
  When Operator memanggil "PUT /api/requests/:id"
  Then backend menolak pembaruan dan mengembalikan respons 403 Forbidden dengan pesan "Cannot edit request that has already been reviewed"

Scenario: Operator mencoba mengedit atau menghapus request milik orang lain
  Given Operator A mencoba memanggil "PUT /api/requests/:id" atau "DELETE /api/requests/:id" milik Operator B
  Then backend menolak dan mengembalikan respons 403 Forbidden

Scenario: Operator mencoba melakukan aksi Approve atau Reject
  Given Operator memanggil endpoint "PATCH /api/requests/:id/review"
  Then backend menolak dan mengembalikan respons 403 Forbidden
```

---

## 4. Modul Maintenance Request: Supervisor

### US-REQ-05: Melihat Seluruh Request dari Semua Operator (View All Requests)
- **Sebagai**: Supervisor
- **Saya ingin**: Melihat daftar seluruh permohonan perbaikan dari seluruh lini produksi pabrik
- **Sehingga**: Saya memiliki visibilitas menyeluruh atas kendala operasional yang terjadi di pabrik.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Supervisor membuka halaman daftar request
  Given Supervisor telah login
  When Supervisor memanggil endpoint "GET /api/requests"
  Then sistem merespons dengan status 200 OK
  And payload menyajikan seluruh data request dari seluruh operator
  And data menampilkan informasi pembuat ("created_by"), mesin, lokasi, prioritas, dan status
```

---

### US-REQ-06: Menyetujui (*Approve*) Request Perbaikan
- **Sebagai**: Supervisor
- **Saya ingin**: Menyetujui request perbaikan yang berstatus `Submitted` dan menambahkan catatan persetujuan
- **Sehingga**: Tim maintenance dapat segera menjadwalkan perbaikan mesin.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Supervisor menyetujui request
  Given terdapat request dengan status "Submitted"
  When Supervisor mengirimkan aksi "Approved" beserta catatan opsional ke endpoint "PATCH /api/requests/:id/review"
  Then sistem merespons dengan status 200 OK
  And status request berubah menjadi "Approved"
  And sistem otomatis mencatat "reviewed_by = supervisor.id" dan "reviewed_at = CURRENT_TIMESTAMP"
```

---

### US-REQ-07: Menolak (*Reject*) Request Perbaikan
- **Sebagai**: Supervisor
- **Saya ingin**: Menolak request perbaikan yang tidak valid atau keliru beserta alasannya
- **Sehingga**: Operator memahami alasan penolakan dan request tidak membebani antrean maintenance.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Supervisor menolak request
  Given terdapat request dengan status "Submitted"
  When Supervisor mengirimkan aksi "Rejected" beserta catatan alasan ke endpoint "PATCH /api/requests/:id/review"
  Then sistem merespons dengan status 200 OK
  And status request berubah menjadi "Rejected"
  And field "reviewed_by" dan "reviewed_at" terisi otomatis
```

---

### US-REQ-08: Pembatasan Otorisasi Supervisor
- **Sebagai**: Sistem Keamanan Aplikasi
- **Saya ingin**: Mencegah Supervisor mengedit detail request milik user lain atau menghapus tiket
- **Sehingga**: Integritas rekaman request tetap terjaga dan wewenang mutlak tetap berada di Admin.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Supervisor mencoba mengedit detail deskripsi request milik orang lain
  Given Supervisor memanggil endpoint "PUT /api/requests/:id" untuk request yang bukan dibuat olehnya
  Then backend menolak aksi tersebut dan merespons dengan 403 Forbidden

Scenario: Supervisor mencoba menghapus request
  When Supervisor memanggil endpoint "DELETE /api/requests/:id"
  Then backend menolak dengan status 403 Forbidden
```

---

## 5. Modul Maintenance Request & User Management: Admin

### US-REQ-09: Mengedit Request Apa Saja (Edit Any Request)
- **Sebagai**: Admin
- **Saya ingin**: Mengedit rincian data request milik siapa pun dan pada status apa pun
- **Sehingga**: Saya dapat melakukan koreksi data darurat atas kesalahan administratif.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Admin mengedit data request milik operator lain yang statusnya sudah Approved
  Given Admin telah login
  When Admin mengirimkan perubahan data ke endpoint "PUT /api/requests/:id"
  Then sistem backend memproses dan mengembalikan respons 200 OK dengan data terupdate
```

---

### US-REQ-10: Menghapus Request (Delete Request)
- **Sebagai**: Admin
- **Saya ingin**: Menghapus data request yang keliru, duplikat, atau tidak relevan
- **Sehingga**: Arsip permohonan perbaikan pabrik tetap bersih dan akurat.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Admin menghapus request
  Given Admin telah login
  When Admin memanggil endpoint "DELETE /api/requests/:id"
  Then sistem menghapus record dan merespons dengan status 200 OK atau 204 No Content
  And record tersebut tidak muncul lagi dalam query daftar request
```

---

### US-USR-01: Melihat Seluruh Daftar Pengguna (User Management)
- **Sebagai**: Admin
- **Saya ingin**: Melihat daftar seluruh pengguna yang terdaftar beserta role dan status keaktifannya
- **Sehingga**: Saya dapat mengontrol siapa saja yang memiliki akses ke sistem pabrik.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Admin mengakses manajemen user
  Given Admin telah login
  When Admin memanggil endpoint "GET /api/users"
  Then sistem mengembalikan 200 OK dengan array seluruh user (id, username, email, role, is_active, created_at)
  And data hash password TIDAK PERNAH dikembalikan ke response client

Scenario: Operator atau Supervisor mencoba mengakses daftar user
  Given Operator atau Supervisor memanggil endpoint "GET /api/users"
  Then backend menolak dengan respons 403 Forbidden
```

---

### US-USR-02: Menambahkan Pengguna Baru
- **Sebagai**: Admin
- **Saya ingin**: Membuat akun pengguna baru dengan menentukan username, email, password awal, dan peran (*Operator*, *Supervisor*, atau *Admin*)
- **Sehingga**: Staf baru di pabrik dapat segera mengakses aplikasi.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Admin membuat user baru
  Given Admin mengirimkan payload valid (username, email, role, password) ke "POST /api/users"
  Then backend memverifikasi keunikan username dan email
  And password di-hash secara aman menggunakan Argon2id atau Bcrypt
  And record tersimpan dengan "is_active = true"
  And sistem merespons dengan 210 Created tanpa mengekspos hash password
```

---

### US-USR-03: Menonaktifkan Pengguna (Deactivate User)
- **Sebagai**: Admin
- **Saya ingin**: Mengubah status pengguna menjadi nonaktif (`is_active = false`)
- **Sehingga**: Akses pengguna tersebut langsung dicabut tanpa harus menghapus data historis buatannya.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Admin menonaktifkan akun operator
  Given Admin memanggil endpoint "PATCH /api/users/:id/status" dengan payload "{"is_active": false}"
  Then sistem mengupdate status pengguna menjadi nonaktif
  And merespons dengan status 200 OK
  And pengguna terkait segera ditolak jika mencoba melakukan login atau memanggil endpoint API
```

---

## 6. Paginasi, Filter, Observabilitas, & Dokumentasi (Bonus #2, #4, #5)

### US-SYS-01: Filter, Paginasi, dan Pencarian Server-Side (Bonus #2)
- **Sebagai**: Supervisor atau Admin
- **Saya ingin**: Melakukan pencarian berdasarkan kata kunci kendala/mesin, memfilter berdasarkan status atau prioritas, dan melihat data dalam bentuk paginasi
- **Sehingga**: Halaman daftar tiket tetap cepat dan responsif saat menangani ribuan baris data seeder.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Melakukan query dengan parameter filter, pencarian, dan limit
  Given terdapat 2.000 data request hasil seeder di database
  When pengguna memanggil "GET /api/requests?page=1&limit=10&status=Submitted&search=PRESS"
  Then query dijalankan di level PostgreSQL menggunakan LIMIT, OFFSET, dan klausa ILIKE
  And sistem merespons dalam waktu < 200ms
  And payload mengembalikan tepat 10 record yang cocok
  And menyertakan metadata navigasi: "total_records", "current_page", "total_pages"
```

---

### US-SYS-02: Health Check & Structured Logging (Bonus #4)
- **Sebagai**: DevOps / System Evaluator
- **Saya ingin**: Memiliki endpoint `/health` dan log sistem berformat JSON terstruktur
- **Sehingga**: Status operasional service dapat dipantau oleh Docker Compose dan memudahkan penelusuran kesalahan sistem.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Health check endpoint dipanggil oleh Docker Compose
  When sistem atau Docker memanggil endpoint "GET /health"
  Then backend melakukan ping koneksi ke database PostgreSQL
  And jika koneksi normal, mengembalikan respons status 200 OK dengan body:
  """json
  {
    "status": "healthy",
    "timestamp": "2026-09-23T08:50:00Z",
    "services": {
      "database": "connected"
    }
  }
  """
  And setiap request HTTP mencetak structured log di konsol berupa objek JSON (timestamp, level, method, path, status, latency)
```

---

### US-SYS-03: Dokumentasi Interaktif OpenAPI / Swagger (Bonus #5)
- **Sebagai**: Developer / Evaluator Penguji
- **Saya ingin**: Membuka antarmuka Swagger UI di browser pada endpoint `/docs`
- **Sehingga**: Saya dapat membaca spesifikasi skema API dan langsung mencoba pemanggilan endpoint secara interaktif.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Mengakses dokumentasi Swagger UI
  When pengguna membuka URL "http://localhost:3000/docs" di browser
  Then halaman Swagger UI interaktif dimuat dengan sempurna
  And seluruh endpoint (Auth, Machines, Requests, Users, Health) terdokumentasi lengkap
  And skema request body, parameter query, serta kode respons HTTP ditampilkan sesuai validasi Zod
```

---

## 7. Pemetaan Skenario Uji Otomatis RBAC (Vitest Matrix - Bonus #6)

Daftar skenario uji otomatis minimum yang wajib dijalankan dan berstatus `PASS` pada saat CI pipeline dieksekusi:

| Test ID | Skenario Pengujian Hak Akses | Aktor | Target Endpoint & Method | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-RBAC-01** | Membuat request baru | Operator | `POST /api/requests` | `201 Created` (status `Submitted`) |
| **TEST-RBAC-02** | Melihat daftar request sendiri | Operator | `GET /api/requests` | `200 OK` (hanya record miliknya) |
| **TEST-RBAC-03** | Membaca request milik user lain | Operator | `GET /api/requests/:other_id` | `403 Forbidden` |
| **TEST-RBAC-04** | Edit request sendiri saat masih `Submitted` | Operator | `PUT /api/requests/:own_id` | `200 OK` |
| **TEST-RBAC-05** | Edit request sendiri saat SUDAH `Approved` | Operator | `PUT /api/requests/:own_id` | `403 Forbidden` |
| **TEST-RBAC-06** | Mencoba approve atau reject request | Operator | `PATCH /api/requests/:id/review` | `403 Forbidden` |
| **TEST-RBAC-07** | Mencoba menghapus request | Operator | `DELETE /api/requests/:id` | `403 Forbidden` |
| **TEST-RBAC-08** | Melihat seluruh request sistem | Supervisor | `GET /api/requests` | `200 OK` (semua request muncul) |
| **TEST-RBAC-09** | Menyetujui (*Approve*) request | Supervisor | `PATCH /api/requests/:id/review` | `200 OK` (status jadi `Approved`) |
| **TEST-RBAC-10** | Menolak (*Reject*) request | Supervisor | `PATCH /api/requests/:id/review` | `200 OK` (status jadi `Rejected`) |
| **TEST-RBAC-11** | Mencoba edit request milik orang lain | Supervisor | `PUT /api/requests/:other_id` | `403 Forbidden` |
| **TEST-RBAC-12** | Mencoba menghapus request | Supervisor | `DELETE /api/requests/:id` | `403 Forbidden` |
| **TEST-RBAC-13** | Mengedit request milik siapa saja pada status apa saja | Admin | `PUT /api/requests/:any_id` | `200 OK` |
| **TEST-RBAC-14** | Menghapus record request | Admin | `DELETE /api/requests/:id` | `200 OK` / `204 No Content` |
| **TEST-RBAC-15** | Mengakses daftar pengguna | Admin | `GET /api/users` | `200 OK` |
| **TEST-RBAC-16** | Operator/Supervisor akses daftar pengguna | Operator/Supervisor | `GET /api/users` | `403 Forbidden` |
| **TEST-RBAC-17** | Menonaktifkan pengguna | Admin | `PATCH /api/users/:id/status` | `200 OK` (`is_active: false`) |
| **TEST-RBAC-18** | Pengguna yang dinonaktifkan mencoba login | Nonaktif User | `POST /api/auth/login` | `401 Unauthorized` / `403 Forbidden` |
