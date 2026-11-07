# GOchat

Aplikasi pesan dengan tiga menu: **Chat**, **Status**, dan **Pengaturan**.
Dibuat dengan HTML, CSS, dan JavaScript biasa tanpa framework, jadi tidak ada langkah build.
Bisa dipasang di HP atau komputer sebagai aplikasi (PWA) dan tetap terbuka saat offline.

## Fitur

- **Chat**: daftar percakapan, pencarian, lencana pesan belum dibaca, ruang obrolan, balasan otomatis, dan grup contoh.
- **Status**: buat status teks dengan warna latar, lihat status kontak, hapus status sendiri. Status hilang setelah 24 jam.
- **Pengaturan**: nama dan info profil, tema (otomatis, terang, gelap), tanda sudah dibaca, suara pesan masuk, atur ulang data contoh.

Kontak, pesan awal, dan balasan adalah contoh. Belum ada akun atau server, dan semua data tersimpan di browser lewat `localStorage`.

## Isi folder

```
index.html               halaman utama
style.css                tampilan dan tema terang/gelap
app.js                   logika aplikasi
manifest.webmanifest     data agar bisa dipasang sebagai aplikasi
sw.js                    service worker untuk mode offline
icons/                   ikon aplikasi
.github/workflows/       otomatis publikasi ke GitHub Pages
```

## Menjalankan di komputer

Service worker butuh `http://localhost`, jadi jalankan server kecil dari folder ini:

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Menaruh di GitHub dan menjadikannya aplikasi

1. Buat repositori baru di GitHub, misalnya `gochat`.
2. Unggah semua isi folder ini ke repositori (termasuk folder `.github`), atau lewat terminal:

   ```bash
   git init
   git add .
   git commit -m "GOchat pertama"
   git branch -M main
   git remote add origin https://github.com/NAMA-KAMU/gochat.git
   git push -u origin main
   ```

3. Di GitHub buka **Settings → Pages**, lalu pada **Source** pilih **GitHub Actions**.
4. Tunggu proses di tab **Actions** selesai (sekitar satu menit). Alamat aplikasi:
   `https://NAMA-KAMU.github.io/gochat/`

Setiap kali kamu `push` ke cabang `main`, aplikasi diperbarui otomatis.

## Memasang di HP atau komputer

- **Android (Chrome)**: buka alamat aplikasi, ketuk menu titik tiga, pilih **Instal aplikasi** atau **Tambahkan ke layar utama**.
- **iPhone (Safari)**: ketuk tombol Bagikan, pilih **Tambah ke Layar Utama**.
- **Komputer (Chrome atau Edge)**: klik ikon pasang di ujung kanan kolom alamat.

## Mengubah aplikasi

Ubah `index.html`, `style.css`, atau `app.js`. Setelah itu naikkan nomor `VERSION` di `sw.js` (misalnya `gochat-v2`) supaya pengguna yang sudah memasang aplikasi mendapat versi baru.

## Langkah berikutnya

Agar pesan benar-benar terkirim antarpengguna, aplikasi ini perlu server dan login, misalnya Firebase atau Supabase. Struktur data di `app.js` (`seed()`) bisa dijadikan acuan untuk tabelnya.
