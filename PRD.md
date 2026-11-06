# Product Requirements Document (PRD)
# Proyek: BlockVerse (Platform Game 2D Cloud Berbasis Block Programming)

---

## 1. Background (Latar Belakang & Tujuan Bisnis)
Industri game modern memiliki hambatan teknis yang sangat tinggi (*high barrier to entry*) bagi pemula, anak-anak, dan calon kreator independen. Untuk membuat game sederhana sekalipun, mereka harus mempelajari sintaksis kode teks yang rumit (seperti C#, C++, atau Lua) serta mengunduh software game engine berukuran gigabyte yang membebani perangkat komputer.

Di sisi lain, pasar game kasual 2D (seperti game *Ular/Snake*, *Pong*, *Space Shooter*, dll.) memiliki peminat yang sangat masif karena sifatnya yang ringan, instan, dan menyenangkan.

**Tujuan Bisnis:**
1. Membangun ekosistem layanan **Cloud Game Service** mandiri yang mendemokratisasi pembuatan game 2D melalui antarmuka visual blok (*block-based programming* ala Scratch/Roblox).
2. Memungkinkan siapa saja membuat game langsung di web tanpa instalasi software, menyimpannya di cloud, dan membagikannya ke pemain di seluruh dunia.

---

## 2. Target Pengguna (User Personas & Demografi)
Target pengguna platform ini terbagi ke dalam 3 segmen peran (*roles*):

1. **Developer / Pembuat Game **:
   - **Profil**: Siswa, mahasiswa pemula, guru/pendidik coding, dan hobiis game.
   - **Kebutuhan**: Ingin menuangkan ide game 2D interaktif tanpa pusing menghafal error sintaksis kode teks.
   - **Kebiasaan**: Menyukai antarmuka visual seret-dan-lepas (*drag-and-drop*), ingin melihat hasil kodingannya secara instan (*live preview*).

2. **Pemain / Player **:
   - **Profil**: Gamer kasual, anak-anak, dan pengguna internet umum.
   - **Kebutuhan**: Ingin hiburan game 2D cepat tanpa perlu menunggu unduhan atau instalasi aplikasi yang berat.
   - **Kebiasaan**: Membuka browser di laptop, Chromebook sekolah, atau smartphone, mencari game di katalog, dan berlomba mencetak skor tertinggi (*High Score*).

3. **Admin / Pemilik Cloud Service (Tim Internal & Operator)**:
   - **Profil**: Pengelola infrastruktur cloud dan operator platform.
   - **Kebutuhan**: Memantau beban server, mengelola database pengguna, memastikan stabilitas layanan, serta memiliki hak memoderasi atau menghapus game yang melanggar ketentuan.

---

## 3. Solusi (Fitur & Fungsionalitas Produk)
BlockVerse menghadirkan solusi menyeluruh yang dibangun secara berurutan dalam 3 sisi utama dan sistem autentikasi 3-role:

### Model Deployment: Private Local Cloud (Laptop sebagai Pusat Layanan Cloud)
Sistem dirancang fleksibel sehingga dapat berjalan secara **On-Premise / Private Local Cloud**:
- **Laptop Host (Pusat Cloud & Database)**: Menjalankan engine backend, SQLite database, dan menyajikan portal web ke seluruh perangkat di jaringan lokal (LAN / Wi-Fi yang sama).
- **Perangkat Teman A (Developer)**: Mengakses IP host dari laptop mereka untuk membuka Developer Studio, menyusun logika blok game, dan mem-publish game ke laptop host.
- **Perangkat Teman B (Player)**: Mengakses IP host dari smartphone/laptop mereka untuk membuka katalog, memainkan game buatan Teman A secara instan, dan mencetak skor ke Cloud Leaderboard.

### Sisi 1: Cloud Game Service (Wadah Backend & Infrastruktur)
- **Game Manifest Storage**: Penyimpanan berbasis cloud untuk data layout kanvas, konfigurasi entitas (kotak/lingkaran), dan struktur pohon logika blok dalam format JSON terstandarisasi.
- **Database Engine**: Menggunakan database SQLite persisten terintegrasi (dengan arsitektur skema yang siap dimigrasikan ke PostgreSQL untuk skala enterprise).
- **Cloud Leaderboard & Sesi**: Pencatatan riwayat skor permainan dan penayangan 10 rekor skor tertinggi (*Top 10 Global Leaderboard*).
- **Admin Monitoring Panel**: Dasbor khusus admin untuk memantau penggunaan memori server, uptime sistem, total game, dan moderasi peran akun pengguna.

### Sisi 2: Developer Studio (Pembuat Game Berbasis Blok 2D Multi-Genre)
- **Pilihan Template Game Multi-Genre**:
  - 🏹 **2D Dungeon Adventure**: Pahlawan menjelajah labirin, mengumpulkan batu permata, mencari kunci emas, menghindari jebakan duri, dan membuka portal keluar untuk menang.
  - 🧩 **2D Maze Puzzle**: Karakter teka-teki labirin mengaktifkan tombol saklar target untuk membuka jalan keluar.
  - 🐍 **Classic Arcade (Snake)**: Ular memakan apel merah dan bertambah panjang.
- **Entitas Dinamis**: Dukungan berbagai objek (*Hero, Key, Door, Gem, Obstacle Wall, Hazard*).
- **Universal Block Logic**: Blok logika kondisi menang (*Win Condition*), kalah (*Game Over*), ambil item (*Destroy Entity*), gerak 4-arah, dan buka pintu.
- **In-Studio Playtest Simulator**: Kanvas simulator lokal untuk menguji coba game secara langsung di dalam studio dengan keyboard sebelum dipublish.
- **One-Click Cloud Publish**: Tombol sekali klik untuk mengompilasi susunan blok menjadi manifest JSON dan mengunggahnya langsung ke Cloud Service.

### Sisi 3: Player Game Client (Mesin Eksekusi Pemain)
- **Web Canvas Runner Ringan (< 65 KB)**: Engine rendering HTML5 Canvas 2D ultra-cepat yang mengunduh manifest game dari cloud dan mengeksekusinya tanpa instalasi plugin apa pun.
- **Universal Input Handler**: Kontrol keyboard (Tombol Panah / WASD) untuk pengguna komputer desktop, serta tombol Virtual D-Pad di layar sentuh untuk pengguna smartphone/tablet.
- **Game Over & Layar Menang (Win Condition)**: Layar akhir game otomatis dengan skor akhir dan tombol pengiriman skor instan ke cloud.

### Gerbang Login Awal & Kontrol Akses 3 Peran (RBAC)
- **Layar Login Awal (Gateway Screen)**: Halaman pembuka layanan mewajibkan login via Username/Email dan Password. Sistem memverifikasi kredensial dan otomatis mengarahkan ke tampilan sesuai peran:
  - **Admin**: Otomatis diarahkan ke **Dashboard Cloud Admin** (Monitoring memori/uptime server, approval antrean developer, & moderasi game).
  - **Developer**: Otomatis diarahkan ke **Developer Studio 2D** (Bisa merakit game & memainkannya jika status akun `ACTIVE`).
  - **Player**: Otomatis diarahkan ke **Katalog Game Arcade** (Bermain game dan mencetak skor leaderboard).
- **Fitur Logout**: Tombol logout di navigasi atas untuk membersihkan token sesi dan mengembalikan pengguna ke Layar Login.
- **Alur Persetujuan Akun Developer (Developer Account Approval Workflow)**:
  - Setiap pengguna yang mendaftar dengan peran **Developer** awalnya berstatus `PENDING`.
  - Akun berstatus `PENDING` belum dapat membuat atau mempublikasikan game ke server. Layar Studio menampilkan pemberitahuan verifikasi beserta tombol cek status persetujuan.
  - Admin Cloud Service memiliki antrean khusus di dasbor admin untuk meninjau, menyetujui (**Approve** &rarr; `ACTIVE`), atau menolak (**Reject** &rarr; `REJECTED`) permohonan akun developer.
  - Setelah disetujui Admin, status developer berubah menjadi `ACTIVE` dan dapat langsung mempublikasikan game.

---

## 4. Hipotesis (Asumsi Dasar Pengembangan)
1. **Kemudahan Akses**: Kami berasumsi bahwa pengguna pemula akan 4x lebih cepat menyelesaikan pembuatan game pertamanya jika menggunakan pemrograman blok visual dibandingkan menulis kode teks tradisional.
2. **Preferensi Pemain**: Kami berasumsi bahwa pemain kasual lebih memilih game web 2D instan (waktu muat < 1 detik) daripada harus mengunduh aplikasi game besar dari App Store/Play Store.
3. **Efek Jaringan UGC**: Kami berasumsi bahwa memberikan akses publikasi cloud instan kepada developer akan menciptakan siklus konten organik yang mandiri, di mana developer akan membagikan tautan game buatannya kepada teman-temannya untuk dimainkan.
4. **Keamanan Ekosistem UGC**: Kami berasumsi bahwa mewajibkan persetujuan (*approval*) akun developer oleh Admin akan mencegah spam, konten game berbahaya, dan overload server cloud.

---

## 5. Ukuran Keberhasilan (Success Metrics / KPIs)
Keberhasilan platform dievaluasi berdasarkan metrik objektif berikut dalam kurun waktu 6 bulan setelah peluncuran:

1. **Metrik Kreator (Developer Funnel)**:
   - Terpublikasikannya game 2D aktif di katalog cloud.
   - *Time to Publish*: Rata-rata waktu pembuatan game pertama oleh developer baru adalah **< 20 menit**.
   - *Approval Response Time*: Admin dapat memproses antrean persetujuan developer rata-rata **< 15 menit**.
2. **Metrik Pemain (Engagement & Retensi)**:
   - Pemain dapat memainkan game yang telah dibuat developer tanpa hambatan instalasi.
   - Peningkatan jumlah sesi main harian (*Daily Active Game Plays*).
3. **Metrik Keandalan Teknis (System Reliability)**:
   - *Game Load Time*: Waktu muat awal game di browser pemain **< 1.0 detik** (p95).
   - *Crash Rate*: Tingkat kegagalan eksekusi canvas runner pada browser target adalah **< 0.1%**.
   - *Cloud API Uptime*: Ketersediaan server backend minimal **99.9%**.

---

## 6. Batasan & Ruang Lingkup (Scope & Boundaries)

### 6.1 Dalam Ruang Lingkup (In-Scope)
1. **Cloud Service API & Database**: Server Express + Node.js SQLite mandiri untuk autentikasi JWT, RBAC 3-peran (Admin, Developer, Player), manajemen manifest game, dan leaderboard.
2. **Developer Studio Scratch-Style 3-Kolom**: Palet kategori blok warna Scratch 3.0, laci blok, kanvas workspace blok, simulator stage interaktif, dan sprite manager.
3. **Multi-Genre 2D Games**: Template Dungeon Adventure (Ksatria, kunci, peti, portal), Maze Puzzle, dan Arcade Snake.
4. **Developer Approval System**: Alur moderasi di mana Admin menyetujui akun developer sebelum fitur publikasi game diaktifkan.
5. **Universal Canvas Runner**: Render 2D berbasis HTML5 Canvas untuk memainkan game tanpa plugin tambahan.

### 6.2 Di Luar Ruang Lingkup (Out-of-Scope)
1. Rendering 3D kompleks (seperti WebGL/Three.js fotorealistis).
2. Transaksi uang nyata / in-app purchase (seluruh aset dan game bersifat gratis).
3. Multiplayer real-time sinkron via WebSocket (fokus pada arsitektur turn-based / high-score asynchronous leaderboard).

---



## 7. Risiko & Mitigasi (Risks & Mitigations)

1. **Risiko 1: Eksekusi Logika Blok Tak Terbatas (*Infinite Loop / Browser Freeze*)**
   - *Dampak*: Browser pemain dapat mengalami freeze jika developer salah menyusun blok loop tanpa jeda.
   - *Mitigasi*: Logika blok dieksekusi secara deklaratif melalui sistem *Game Tick Timer* tetap (misal: per 140ms), bukan loop JavaScript mentah (`while true`), sehingga tidak akan membekukan thread utama browser. Larang penggunaan fungsi `eval()`.

2. **Risiko 2: Kecurangan Skor Leaderboard (*Leaderboard Score Tampering*)**
   - *Dampak*: Pengguna memanipulasi skor palsu jutaan poin melalui request API langsung.
   - *Mitigasi*: Endpoint penyimpanan skor dilindungi autentikasi token JWT, validasi tipe data ketat, dan pembatasan frekuensi pengiriman skor (*rate limiting*).

3. **Risiko 3: Penolakan Akses oleh Pengguna Perangkat Mobile**
   - *Dampak*: Pemain yang membuka lewat smartphone kesulitan mengontrol game tanpa keyboard fisik.
   - *Mitigasi*: Sistem secara otomatis menyediakan kontrol **Virtual D-Pad Touch** responsif di layar ketika dibuka pada resolusi mobile/tablet.


---

## 8. Sumber Daya (Resources & Budgeting)

### 8.1 Kebutuhan Tim (Human Resources)
- **1 Technical Product Manager**: Mengawal prioritas fitur, roadmap rilis, dan validasi kebutuhan pengguna.
- **1 Lead Backend & Cloud Engineer**: Mengembangkan API Cloud Service, manajemen session JWT, database SQLite/PostgreSQL, dan orkestrasi server.
- **1 Frontend & Game Engine Engineer**: Mengembangkan UI portal (React/Tailwind), integrasi Google Blockly/Visual Blocks, dan engine HTML5 Canvas 2D runner.
- **1 UI/UX Designer**: Merancang antarmuka ramah anak untuk Developer Studio dan layout katalog game.
- **1 QA Engineer**: Menguji performa kanvas di berbagai perangkat (low-end smartphone, laptop) dan validasi keamanan RBAC.

### 8.2 Infrastruktur & Perangkat Lunak
- **Server Komputasi Cloud**: Laptop untuk environment local
- **Domain & SSL**: blockverse.cloud / blockgame.io dengan sertifikat TLS terenkripsi.
- **Tooling Pengembangan**: Node.js v22+, Vite, TypeScript, GitHub Actions (CI/CD Pipeline).


