# Monitoring SE2026

Monitoring SE2026 adalah aplikasi dasbor (dashboard) berbasis web yang dirancang khusus untuk **Monitoring Progres Pendataan Lapangan Sensus Ekonomi 2026 (SE2026)**. Aplikasi ini memberikan visualisasi data secara _real-time_ untuk memantau kinerja Petugas Pendataan Lapangan (PPL) dan Pengawas Menengah Lapangan (PML) pada wilayah terkait (seperti Kabupaten Mempawah).

## 📊 Spesifikasi Web & Teknologi

Aplikasi ini dibangun menggunakan arsitektur antarmuka (frontend) modern tanpa memerlukan server backend khusus (Serverless / No-SQL approach), dengan spesifikasi teknis sebagai berikut:

- **Kerangka Kerja (Framework):** [React](https://react.dev/) dengan TypeScript, dibangun dan dikompilasi menggunakan [Vite](https://vitejs.dev/) untuk performa pengembangan yang super cepat.
- **Styling & Desain:** [Tailwind CSS](https://tailwindcss.com/) digunakan untuk mendesain antarmuka (UI) yang responsif, dinamis, dan ramah pengguna di berbagai perangkat (komputer, tablet, maupun _smartphone_).
- **Visualisasi Data:** Menggunakan [Recharts](https://recharts.org/) untuk merender grafik interaktif yang reaktif terhadap perubahan data.
- **Ikon & Tipografi:** Menggunakan [Lucide React](https://lucide.dev/) untuk ikon yang minimalis, dipadukan dengan tipografi modern untuk antarmuka yang profesional.
- **Sistem Database:** Memanfaatkan **Google Sheets API (gviz)** sebagai _headless CMS_ untuk mengambil data CSV mentah secara otomatis dan seketika (_client-side fetching_). Hal ini memudahkan pengelola data untuk memperbarui nilai target, submit, dan draf hanya melalui _spreadsheet_.
- **State Management & Performa:** Menggunakan React Hooks bawaan (`useState`, `useMemo`, `useEffect`) yang dioptimalkan untuk memanipulasi ratusan baris data relasional dari beberapa *sheet* berbeda tanpa membebani peramban (browser). Paginasi dan pemfilteran berlapis juga ditangani seluruhnya di sisi *client*.

## 🖥️ Isi Dashboard

Dasbor ini memuat berbagai komponen informatif untuk melacak aktivitas di lapangan:

1. **Panel Metrik KPI (Key Performance Indicator):** 
   - **Total Submit:** Menampilkan akumulasi kontribusi bersih berkas yang disubmit hari ini, lengkap dengan persentasenya terhadap target.
   - **Total Draft:** Menampilkan jumlah berkas yang saat ini masih dalam status *draf* (perlu re-review), lengkap dengan waktu *update* terakhir dan persentasenya.
   - **Akumulasi Progres Target:** Memantau akumulasi total submit secara riil dibandingkan dengan target yang ditetapkan.
   - **SLS Prioritas Target GC PBI:** Menampilkan pemantauan wilayah yang merupakan target prioritas (Selesai, Sedang Dikerjakan, dan Belum Dikerjakan).
2. **Filter Global:** Memungkinkan pengguna untuk mencari dan menyaring data di seluruh dasbor secara instan berdasarkan nama PML (Pengawas) dan nama PPL (Petugas).
3. **Progres Menurut Geografis:** Grafik batang interaktif yang membandingkan perolehan (Submit, Draft, dan Belum Kirim) antar tingkat **Kecamatan** maupun **Desa** (dengan batasan 5 desa teratas) yang dilengkapi dengan *tooltip* informatif mendetail terkait persentase pencapaian.
4. **Tren Progres Harian:** Grafik garis dinamis yang menyoroti pergerakan *Submit* dan *Draft* dari hari ke hari selama periode pendataan. 
5. **Apresiasi Bintang Progres Teraktif Hari Ini:** Menampilkan daftar PPL dengan jumlah submit tertinggi hari ini sebagai bentuk penghargaan instan atas produktivitas mereka.
6. **Peringkat Produktivitas (Leaderboard):** Menyajikan peringkat harian petugas berdasarkan rata-rata produktivitas *(Average Submit per day)* dengan visualisasi *mini progress bar*.
7. **Tabel Data Rinci:** Tabel data tabular berfitur lengkap dengan fungsi pencarian (search), pengurutan data (sorting), serta paginasi untuk melihat rincian progres pada tingkat PPL. Tabel ini dibagi menjadi beberapa tab, termasuk mode harian dan mode komprehensif.

## 🌟 Manfaat Aplikasi

- **Transparansi Kinerja:** Membantu koordinator, pengawas, dan petugas untuk melihat gambaran yang jelas mengenai capaian yang telah dilakukan secara transparan dan terukur.
- **Pengambilan Keputusan Cepat:** Dengan visualisasi wilayah geografis yang lambat atau petugas yang tertinggal, strategi pengerahan sumber daya dapat disesuaikan segera sebelum target waktu berakhir.
- **Motivasi (Gamifikasi):** Fitur *Leaderboard* dan *Bintang Progres* secara psikologis memacu semangat para petugas lapangan untuk bekerja lebih baik dan disiplin menyelesaikan data.
- **Kemudahan Manajemen Server:** Integrasi dengan Google Sheets meniadakan biaya server database atau keahlian teknis khusus untuk admin lapangan. Setiap perubahan di *spreadsheet* akan langsung tercermin di dasbor.
- **Akses Fleksibel:** Desain responsif memungkinkan pimpinan untuk memantau progres SE2026 langsung dari genggaman ponsel mereka kapan saja.

---

## 🛠️ Cara Menjalankan di Komputer Lokal (Localhost)

Ikuti langkah-langkah berikut untuk menjalankan aplikasi ini di komputer Anda sendiri:

**Prasyarat:** Pastikan Anda telah menginstal [Node.js](https://nodejs.org/).

1. **Clone repositori ini (atau unduh kodenya)**
   ```bash
   git clone https://github.com/ahmadrahman79/Prasasti-SE2026.git
   cd Prasasti-SE2026
   ```

2. **Instal dependensi library**
   ```bash
   npm install
   ```

3. **Jalankan server lokal (Development)**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000/` (atau port lain yang tertera di terminal).

## 🌍 Cara Mengubah Sumber Data (Google Sheets)

Sumber data aplikasi ini terhubung ke sebuah Google Sheet secara terbuka. Jika Anda ingin mengganti sumber datanya:
1. Buat Google Sheet Anda sendiri dengan format kolom yang persis sama.
2. Pastikan setelan "Bagikan" (Share) Google Sheet Anda diatur ke **"Siapa saja yang memiliki link" (Pelihat)**.
3. Ambil **ID Spreadsheet** Anda (karakter acak panjang di dalam URL Google Sheet).
4. Buka file `src/App.tsx`, cari konstanta `DEFAULT_SPREADSHEET_ID`, dan ganti dengan ID Anda.

---
*Dibuat untuk kelancaran Sensus Ekonomi 2026.*
