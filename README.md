# BlockVerse: 2D Cloud Game Platform Berbasis Block Programming

Platform ekosistem game 2D berbasis *User-Generated Content* (UGC) ala Roblox/Scratch, di mana developer membuat game menggunakan **pemrograman visual blok** (*Block-based programming*), disimpan dan didistribusikan melalui **Cloud Game Service**, serta dapat langsung dimainkan instan oleh para pemain melalui **Player Web Client**.

---

## 🏗️ 3 Pilar Utama Sistem

1. **Cloud Game Service (Pilar 1 - Backend & Storage)**:
   - Menyimpan dan melayani *Game Manifest* (skema JSON terstruktur berisi konfigurasi kanvas, entitas, dan pohon logika blok AST).
   - API autentikasi, catalog game, pencatatan statistik permainan, dan *Cloud Leaderboard*.
   - Database SQLite persisten terintegrasi (siap dimigrasikan ke PostgreSQL).

2. **Developer Studio (Pilar 2 - Pembuat Game Blok 2D)**:
   - Editor visual khusus game 2D (seperti *Snake*, *Pong*, dsb.).
   - Visual Block Programming Workspace:
     - 🟡 **Event Blocks**: `Ketika Game Dimulai`, `Setiap Game Tick (ms)`, `Ketika Menabrak Objek`, `Ketika Tombol Ditekan`.
     - 🔵 **Action Blocks**: `Gerakkan Entitas Maju`, `Ubah Arah Gerak`, `Munculkan Entitas di Koordinat Acak Grid`, `Tambah Skor`, `Perpanjang Ekor Tubuh`, `Mainkan Suara Beep`.
   - Konfigurasi bentuk geometris (kotak ular, lingkaran apel) dan warna.
   - Simulator Playtest lokal langsung di dalam Studio.
   - Tombol **"Publish ke Cloud"** satu-klik.

3. **Player Game Client (Pilar 3 - Mesin Pemain Game 2D)**:
   - Engine HTML5 Canvas ringan (< 65 KB) tanpa dependensi library besar.
   - Mengunduh manifest game dari Cloud Service dan mengeksekusi logika blok secara real-time.
   - Kontrol ganda: Keyboard (Panah / WASD) di desktop dan Virtual D-Pad Touch di smartphone/tablet.
   - Layar Game Over otomatis dan tombol simpan skor ke Cloud Leaderboard.

---

## 👥 Sistem Autentikasi 3 Role (RBAC)

Platform memisahkan hak akses ke dalam 3 hierarki:
- **Admin**: Pemilik Cloud Service. Dapat memantau status server, uptime, memori, memoderasi/menghapus game bermasalah, dan mengubah peran pengguna.
- **Developer**: Pembuat game. Memiliki akses membuka Developer Studio, merakit game dengan blok, mem-publish ke cloud, dan memainkan seluruh game.
- **Player**: Pemain game. Hanya memiliki hak akses menjelajah katalog dan memainkan game (akses ke Studio atau Admin dibatasi).

### Akun Demo Bawaan (Siap Digunakan):
| Peran (Role) | Email | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@blockgame.cloud` | `admin123` | Monitoring Cloud, Hapus Game, Kelola Role |
| **Developer** | `dev@blockgame.cloud` | `dev123` | Buka Studio 2D, Bikin Game Blok, Mainkan Game |
| **Player** | `player@blockgame.cloud` | `player123` | Jelajah Katalog, Mainkan Game, Simpan Skor |

> *Catatan: Di navigasi web portal, tersedia fitur **"Uji Role"** satu-klik untuk berpindah akun demo secara instan tanpa perlu logout-login manual.*

---

## 🚀 Cara Menjalankan Proyek

### 1. Prasyarat
- Node.js versi 20+ atau 22+ (mendukung built-in `node:sqlite`).

### 2. Menjalankan Server & Web Portal Sekaligus
Di root folder `/Users/macbookpro/block-game-platform`:

```bash
npm run dev
```

Ini akan menjalankan dua service secara bersamaan:
- **Cloud Game Service API**: `http://localhost:3001`
- **Web Portal (Studio & Player Client)**: `http://localhost:3000`

Buka browser di **`http://localhost:3000`** untuk mulai mencoba!

---

## 🧪 Menjalankan Pengujian Otomatis (Automated Tests)

Di root folder, jalankan:
```bash
npm test
```
Pengujian mencakup:
- Validasi autentikasi login 3 role.
- Pengecekan pengambilan manifest game *Snake 2D* dari cloud.
- Verifikasi keamanan RBAC (Role Player dicegah dari mempublish game, Developer diizinkan).
- Verifikasi proteksi rute metrik Admin.
