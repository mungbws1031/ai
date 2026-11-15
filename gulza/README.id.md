# GULZA — Pembuat Video Lirik dan Subtitle Bergerak Gratis

**[Gunakan situs berbahasa Indonesia](https://ruruoni1.github.io/gulza/id/)** · [Naskah asli bahasa Korea](README.md) · [JIZURA asli](https://github.com/852wa/JIZURA)

**Bahasa lain:** [한국어](README.md) · [日本語](README.ja.md) · [English](README.en.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md) · [Tiếng Việt](README.vi.md)

GULZA adalah alat browser gratis untuk membuat video bergerak dari lirik dan subtitle, lalu menyimpannya sebagai MP4.

Namanya berasal dari kata Korea “글자” yang berarti huruf atau tulisan.

Proyek ini menggunakan 860 komponen animasi dan 27 gaya dari [JIZURA](https://github.com/852wa/JIZURA).

Fork ini dapat mengimpor file subtitle SRT secara langsung tanpa mengubahnya menjadi LRC.

**Versi saat ini: v0.16.1** · Gunakan [situs web](https://ruruoni1.github.io/gulza/id/) tanpa instalasi atau akun. Alamat utama dibuka dalam bahasa Korea; bahasa antarmuka dapat diganti di bagian atas halaman. · [Riwayat perubahan](CHANGELOG.md)

## Fitur yang ditambahkan di fork ini

- **Impor SRT langsung:** Buka file `.srt` tanpa konversi untuk mulai membuat video subtitle. Bagian tanpa subtitle tetap ditampilkan.
- **Dukungan file subtitle Korea:** Baca SRT/LRC berformat UTF-8, UTF-16, atau penyandian Windows Korea, hingga 2 MB.
- **Ekspor LRC:** Simpan waktu mulai setiap subtitle ke dalam LRC. Untuk mempertahankan waktu selesai, simpan proyek yang berisi SRT.
- **Pilihan bahasa antarmuka:** Bahasa Korea adalah bawaan; tersedia juga Jepang, Inggris, Mandarin Tradisional dan Sederhana, Indonesia, serta Vietnam.
- **Nama file GULZA:** Jika judul kosong, file disimpan sebagai `gulza.mp4`, `gulza.project.json`, dan sebagainya.

Penanda waktu SRT ditampilkan di bidang lirik sebagai `[SRT:00:00:01.000-->00:00:02.300]subtitle`.

Mengubah penanda tersebut juga mengubah waktu subtitle.

## Fitur utama

- **Konfigurasi otomatis:** Satu tombol `R` Ciptakan kembali gaya, suasana hati, gerakan, skema warna, dan komposisi potongan dengan tombol. Jika Anda mengganti seed, videonya akan berbeda.
- **Sunting waktu:** Anda dapat mendeteksi irama sumber suara dan mengatur pemotongannya, atau mengetuk langsung selama pemutaran untuk menentukan waktu mulai saluran dan pemotongan.
- **Pengaturan keluaran:** Pilih rasio aspek 16:9, 9:16, 4:3, 3:4, 1:1, 4:5, 21:9, resolusi 720p~4K, 24/30/60fps.
- **Video dan Gambar:** Anda dapat mengekspor MP4, urutan PNG, PNG transparan, dan PNG yang dipisahkan latar depan/latar belakang. Anda juga dapat memilih antara layar hijau dan latar belakang hitam.
- **Simpan proyek:** Anda dapat menyimpan dan membuka kembali hasil edit Anda sebagai JSON, dan bahkan mengekspor konfigurasi JSON untuk After Effects.

| file di repositori | menggunakan |
|---|---|
| [`index.html`](index.html) | Layar bahasa Korea default untuk Halaman GitHub. Bahasa lain di setiap folder `index.html`ada di |
| [`src/`](src/) · [`app/`](app/) | Mesin gerak, layar, terjemahan bahasa Korea, dan sumber pembuatan |
| [`GULZA_AE.jsx`](GULZA_AE.jsx) | Panel After Effects ScriptUI Korea untuk GULZA |
| [`GULZA_CEP.zip`](GULZA_CEP.zip) | Panel CEP After Effects Korea untuk GULZA |
| [`ae/`](ae/) · [`cep/`](cep/) | Sumber dan materi instalasi untuk panel After Effects |
| [`docs/EXPRESSION_PACKS.md`](docs/EXPRESSION_PACKS.md) | Dokumentasi untuk pengembang yang menambahkan bagian ekspresif |

## Memulai

1. [situs GULZA](https://ruruoni1.github.io/gulza/id/)Membuka .
2. **Muat SRT/LRC**Pilih file subtitle dengan , atau tulis baris demi baris langsung di kolom input lirik.
3. Jika ada sumber suara, muatlah. Anda dapat membuat video subtitle bahkan tanpa sumber audio.
4. **Buat secara otomatis**Ketuk dan periksa pratinjau. Yang saya suka adalah **Sebelumnya / Berikutnya**Anda dapat memilihnya lagi.
5. Setelah mengatur rasio layar, resolusi, dan kecepatan bingkai, **Ekspor MP4**Tekan .

### lingkungan penggunaan

Ekspor MP4 memerlukan dukungan WebCodecs di browser Anda. Chrome dan Edge direkomendasikan.

Codec yang tersedia bervariasi tergantung pada browser dan sistem operasi Anda. Meskipun Anda tidak dapat membuat MP4, Anda masih dapat melihat pratinjau dan mengekspor rangkaian PNG.

Anda juga dapat mengeditnya di ponsel cerdas Anda. PC lebih cocok untuk video panjang atau output resolusi tinggi.

Font yang diperlukan diambil dari Google Fonts. Saat offline, font di perangkat Anda mungkin diganti.

## Pembuatan dan penyesuaian otomatis

dari layar **Sederhana / Lanjutan**Ubah mode pengeditan di .

Dalam mode sederhana **Buat secara otomatis**Tekan untuk memilih ulang yang berikut ini sekaligus.

- Gaya, warna latar belakang, dan font yang digunakan dalam judul dan isi
- Suasana hati: Glitch, chill, pop, grafis, editorial, emosional, campuran total. Jika Anda mengaktifkan penyutradaraan horor, horor juga akan dimasukkan ke dalam kandidat.
- Intensitas gerakan, jumlah gangguan dan dekorasi, serta bagian ekspresif yang digunakan.
- Potong konfigurasi dan bijinya

**Sebelumnya / Berikutnya**Anda dapat bolak-balik antar catatan yang dibuat dengan .

**Ubah saja bagian ini**mempertahankan desain saat ini dan hanya memilih salah satu dari berikut ini: gaya, skema warna, suasana, dan komposisi.

Lirik, sumber suara, pengaturan waktu, pengaturan keluaran, dan baris terkunci dibuat secara otomatis dan tidak berubah.

### Rentang ekspresi yang digunakan untuk pembuatan otomatis

Anda dapat membatasi kandidat untuk pembuatan otomatis, mengacak, dan menggambar ulang per baris dengan mencentang item.

Anda dapat menggunakan ekspresi Anda sendiri terlepas dari batasan ini.

| barang | keadaan awal | Bagaimana cara kerjanya |
|---|---|---|
| Pengarahan tambahan juga digunakan | Mati | Saat diaktifkan, ini juga akan memilih ekspresi, gaya, dan font yang ditambahkan ke 356 bagian dan 12 gaya di rilis awal. |
| Penyutradaraan gaya Jepang juga digunakan. | Pada | Kandidatnya mencakup ekspresi gaya Jepang seperti lentera, shoji, kipas angin, bunga sakura, dan pola tradisional. |
| Penggunaan komponen tipografi | Pada | Kami menggunakan 50 bagian untuk gambar karakter yang diekspresikan melalui garis, angka, spasi huruf, dan penyusunan huruf. |
| Penggunaan komponen kinetik | Pada | Ini menggunakan 51 bagian di mana kata-kata bergerak, bertumpuk, atau berpotongan. |
| Penyutradaraan horor juga digunakan. | Mati | Gunakan 52 bagian horor dan 3 gaya terkait dan tambahkan horor ke suasana yang dibuat secara otomatis. |

Dalam daftar ekspresi, masing-masing bagian tambahan, gaya Jepang, tipografi, kinetik, dan horor ditandai.

Item yang tidak dipilih secara otomatis dalam pengaturan saat ini tampak redup.

### layar ponsel

Saat layar sempit atau Anda mengoperasikannya dengan sentuhan **seluler** modus tersedia.

Tombol dan pratinjau yang dibuat secara otomatis terlihat bahkan saat menggulir. Edit daftar baris dengan memperluas hanya baris yang Anda perlukan.

Simpan, buka, dan setel ulang dikumpulkan dalam menu. Resolusi keluaran pertama dalam mode seluler adalah 720p.

### Ubah skema warna

**Lanjutan → Gaya → Warna aksen/Warna offset**pada **skema warna acak**Tekan untuk memilih ulang dua warna.

Anda dapat membuat kombinasi baru dari kombinasi yang sudah jadi atau dari roda warna. Kecerahan warnanya juga diatur agar teks dapat dibaca sesuai dengan kecerahan latar belakang.

Anda juga dapat menentukan sendiri warnanya. Jika Anda menghapus warna yang Anda tentukan, warna tersebut akan kembali ke warna default gaya.

## Petunjuk terperinci tentang pengeditan browser

### Notasi lirik dan subtitle

Biasanya satu baris lirik adalah satu frase.

Garis kosong menciptakan celah singkat.

| Contoh masukan | arti |
|---|---|
| `새벽의 색을/기억하고 있어` | `/`Bagilah potongannya. |
| `*투명*` | Tekankan kata tersebut. |
| `마지막 문장!` | Tambahkan flash dan goyangkan ke akhir baris. |
| `가사\|작은 메모` | Tambahkan teks kecil untuk komentar. |
| `[01:23.45]가사` | Terapkan waktu mulai LRC. |
| `[간주 8]` | Ini hanya menampilkan latar belakang dan dekorasi selama 8 detik tanpa lirik apa pun. Jika tidak ada angka, itu adalah 4 detik. |
| `# 메모` | Ini dianggap sebagai anotasi karya dan tidak akan disertakan dalam video. |

**Muat SRT/LRC**Jika Anda membuka file dengan , lirik saat ini akan berubah. Jendela konfirmasi akan terbuka sebelum mengubah.

Bahkan setelah menelepon **kembali**Anda dapat mengembalikan keadaan sebelumnya dengan .

SRT mempertahankan waktu mulai dan berakhir. LRC hanya dapat memuat waktu mulai.

### Sumber dan waktu suara

- Saat Anda memuat sumber suara, ia mendeteksi BPM dan ketukan serta menyesuaikan batas pemotongan mendekati ketukan. Musik yang diunduh akan disimpan di browser yang sama dan dapat dipulihkan saat Anda membuka kembali halaman tersebut.
- **Sinkronisasi dengan tab:** Saat setiap baris dimulai `Space`Tekan . Jika Anda menekan tombol yang salah `Backspace`Saya **kembalikan satu**Menggunakan .
- **Mulai lagi dari tengah:** Tekan tombol Sinkronisasi di daftar baris.
- **Fitur tambahan tab:** Anda dapat menurunkan kecepatan pemutaran menjadi 0,75x atau 0,5x atau mengaktifkan hitungan mundur. Waktu simpan adalah waktu asli lagu tersebut.
- **Waktu Potong:** Ketika ada beberapa pemotongan dalam satu baris, saat berpindah `Tab`Tekan .
- Anda dapat memasukkan waktu mulai daftar garis secara langsung sebagai angka atau menyesuaikannya dengan menyeret batas garis garis waktu. Anda juga dapat memperbesar/memperkecil garis waktu dan memindahkan posisi pemutaran.
- Lirik dan waktu berubah **kembali** atau `Ctrl+Z`Anda dapat membatalkan dengan .

### Mengedit garis dan potongan secara terpisah

Anda dapat mengedit baris itu saja dengan menekan tombol pensil di daftar baris atau mengklik dua kali liriknya.

Jumlah pemotongan per garis dapat diatur ke otomatis atau 1 hingga 6. Anda juga dapat menggambar garis itu lagi dengan dadu.

Saat dihidupkan, kunci mempertahankan komposisi dan skema warna garisnya. **acak**menarik kembali seluruh konfigurasi tanpa menguncinya.

**tema**Jika Anda memilih salah satu Video Teks, Kinetik, Gaya Jepang, Horor, Pop, atau Balada, arah pembuatan otomatis akan dipersempit.

Dalam mode lanjutan, Anda dapat mengubah tata letak, tampilan, pemeliharaan, keluar, dekorasi, efek teks, latar belakang, kamera, dan transisi untuk setiap potongan.

Kunci klasifikasi dan kunci nilai presentasi dipertahankan bahkan setelah pembuatan otomatis dan juga disimpan dalam file proyek.

di sebelah untuk bermain **mengulang**perubahan dalam urutan berikut: Semua → Garis → Potong → Tanpa Pengulangan.

Rentang pengulangan ditampilkan pada timeline.

### Gaya, arah, font

27 gaya tersebut merupakan pengaturan yang menggabungkan kombinasi warna, font, dan tekstur.

Ada gaya sakura, laut dalam, matahari terbenam, koran, kertas, synth, dan horor. Bahkan dalam satu video, latar belakang dapat berubah untuk setiap pemotongan.

Font dimuat saat dibutuhkan. Nama font yang diinstal pada PC Anda `.ttf`·`.otf` Anda juga dapat mengubahnya menjadi file.

**Lanjutan → Arah**Sesuaikan gerakan, gangguan, ketidaksejajaran warna, dekorasi, kerapatan potongan, tekstur, dan penahan bingkai.

Meskipun Anda menyembunyikan angka dan waktu dekoratif, angka yang tertulis di liriknya akan tetap ada.

**Lanjutan → Teknik**Anda dapat mengaktifkan dan menonaktifkan 10 kategori bagian ekspresi satu per satu. Ini juga menyediakan pencarian nama dan on/off/inversi penuh.

**rasa kesatuan**Saat diaktifkan, bagian terpisah dan lirik yang diulang menggunakan tata letak dan gerakan yang serupa. Tempatkan arah yang kuat pada garis yang perlu ditekankan.

**penyelarasan karakter**Menyesuaikan ukuran font, spasi, dan dekorasi. Kedua opsi tersebut dapat dimatikan.

**Bagian tengah kosong (untuk karakter)**Mengamankan ruang di tengah untuk menggabungkan gambar lainnya.

Lirik ditempatkan di kiri dan kanan pada layar horizontal, dan atas dan bawah atau kiri dan kanan pada layar vertikal.

Garis putus-putus di pratinjau menunjukkan rentang yang akan dikosongkan dan tidak akan disertakan dalam keluaran.

### Format dan jangkauan keluaran

| membentuk | Menggunakan |
|---|---|
| MP4 | Video selesai. Jika Anda memiliki sumber suara, Anda dapat menyertakannya. |
| ZIP Urutan PNG | Digunakan saat menyusun gambar bingkai demi bingkai di editor lain. |
| ZIP PNG transparan | Digunakan untuk menggabungkan teks dan presentasi tanpa latar belakang. |
| Pisahkan ZIP PNG latar depan dan latar belakang | `front/`Dan `back/` Simpan elemen depan dan belakang satu bingkai secara terpisah dalam satu folder. |
| LRC | Ini adalah file lirik yang mencatat waktu mulai setiap baris. |
| JSON untuk After Effects | Digunakan untuk mentransfer informasi pengaturan dan konfigurasi saat ini ke panel GULZA AE. |

**jangkauan untuk diekspor**Jika Anda memilih baris pertama atau terakhir, hanya baris terpilih yang akan dicetak. Dalam nama file `_L03-05`Nomor baris ditambahkan sebagai berikut.

Di Chrome·Edge, Anda dapat merekam video berukuran besar langsung ke file yang ingin Anda simpan. Jika pengkodean GPU gagal, coba metode lain.

Jika browser Anda gagal menyimpan audio AAC, file WAV terpisah mungkin disimpan bersamanya.

**lirik yang jelas**Menghapus pengaturan waktu, penunjukan, dan rentang keluaran untuk setiap lirik dan baris. Tindakan ini dapat dibalik.

**mengatur ulang**menghapus musik yang disimpan, pengaturan, dan bahkan riwayat pekerjaan. Ini akan dieksekusi setelah konfirmasi dan tidak dapat dibatalkan.

File JSON proyek yang diunduh secara terpisah tidak akan dihapus.

### Kecepatan bingkai dan pergerakan

Pilih kecepatan bingkai keluaran dari 24/30/60fps. Kecepatan bingkai dan tekstur gerakan adalah pengaturan terpisah.

- **2 penahan bingkai:** Pergerakan 12 gambar per detik menciptakan perasaan terputus.
- **3 penahan bingkai:** 8 bidikan per detik menciptakan nuansa yang lebih beku.
- **seluruh:** Ia bergerak pada setiap fps keluaran yang dipilih untuk pengalaman sehalus mungkin.

60fps dan 4K membutuhkan waktu lebih lama untuk dihasilkan.

### Layar hijau, latar belakang hitam dan PNG transparan

Untuk meletakkan lirik di atas video lain **Ekspor → Latar Belakang**Pilih antara layar hijau, latar belakang hitam, atau latar belakang polos.

layar hijau berwarna hijau `#00FF00`, latar belakang hitam berwarna hitam `#000000`Menggunakan . Pengaturan tercermin dalam pratinjau dan keluaran.

Dalam nama file `_greenback` atau `_blackback`Ini terlampir.

Layar hijau dihilangkan menggunakan kunci kroma, dan latar belakang hitam dihilangkan menggunakan komposisi layar atau tombol kecerahan.

Jika Anda memilih PNG transparan, Anda dapat menggabungkannya tanpa menghapus latar belakang. Di ZIP pemisahan latar depan dan latar belakang, `front/`pemeran `back/` Letakkan di atas.

Efek flash dan layar dapat diterapkan dalam dua lapisan, jadi periksalah hasil gabungannya.

### Bahasa lirik dan font

**bahasa lirik**Standarnya adalah deteksi otomatis. Tentukan bahasa dengan melihat Hangul, Kana, karakter Cina, dan Inggris.

Jika hasilnya tidak cocok, Anda dapat memilih antara bahasa Korea, Jepang, Mandarin (Tradisional/Sederhana), dan Inggris. Layarnya sendiri tetap dalam bahasa Korea.

| Keluarga font gaya asli | Contoh font yang sesuai dalam lirik bahasa Korea |
|---|---|
| Noto Sans JP·Zen Kaku Gothic New | Noto Sans KR |
| Noto Serif JP·Zen Old Mincho | Noto Serif KR |
| Dela Gothic One | Black Han Sans |
| M PLUS Rounded 1c | Jua |
| Mochiy Pop One·Kiwi Maru | Do Hyeon·Gowun Dodum |
| Klee One·Yuji Syuku | Gowun Batang·Nanum Brush Script |

Dalam lirik bahasa Inggris, potongannya dibagi menjadi beberapa kata. `/`Jika ada posisi yang dibagi langsung dengan , maka pembagian itu diikuti.

Pilihan bahasa Anda juga disimpan di proyek JSON Anda.

### Panduan untuk pengguna pertama kali

Saat pertama kali membuka situs ini, Anda akan dipandu dalam urutan berikut: Lirik → Sumber suara → Pembuatan otomatis → Pratinjau → Edit per baris → Ekspor.

atas **?** Anda dapat membukanya kembali dengan sebuah tombol.

Pengaturan volume pratinjau dan bisu diingat oleh browser. Volume pratinjau tidak mengubah volume keluaran MP4.

## 860 bagian ekspresi

860 bagian ekspresif tersebut terdiri dari 356 asli, 351 tambahan, 50 tipografi, 51 kinetik, dan 52 horor.

Anda dapat menggabungkan bagian berdasarkan kategori dalam satu potongan. Anda dapat menggunakan banyak dekorasi.

| Kategori | Jumlah | Contoh efek |
|---|---:|---|
| Tata letak | 184 | Tengah, teks vertikal, balon percakapan, kertas naskah, kredit akhir |
| Muncul | 125 | Terurai lalu menyatu, irisan, domino, neon menyala |
| Bertahan | 52 | Getaran halus, melayang, denyut mengikuti irama, perpindahan fokus |
| Menghilang | 109 | Ledakan, pintu menutup, penghapusan, kaca pecah |
| Dekorasi | 130 | Bidikan, radar, kelopak bunga, rasi bintang |
| Efek huruf | 62 | Garis tepi, cahaya, penyorot, pergeseran warna |
| Latar belakang | 66 | Kisi, aurora, langit malam, jendela berhujan |
| Kamera | 36 | Perbesar, geser, goyang, putar |
| Efek layar | 69 | Glitch, inversi, kilatan, VHS |
| Transisi adegan | 27 | Sapuan linier, dorong, tirai, mosaik |

Bagian memiliki tag suasana hati. Generasi otomatis terlebih dahulu memilih bagian-bagian yang sesuai dengan suasana yang dipilih.

Kumpulan ekspresi dasar mencakup bagian tata letak, pintu masuk, penahan, dan keluar, serta efek glitch, flash, dan tekstur.

## Panel After Effects

Tersedia dua panel yang dibangun dengan nama GULZA: ScriptUI dan CEP.

Nama menu, komposisi yang dibuat, berkas laporan diagnostik, dan ID ekstensi CEP menggunakan nama GULZA.

Perintah **Ekspor untuk AE** di browser menyimpan waktu mulai dan selesai tiap potongan ke JSON.

Panel ScriptUI menerapkan waktu tersebut ke titik awal dan akhir lapisan AE.

| Jenis | Berkas | Kegunaan |
|---|---|---|
| ScriptUI | [`GULZA_AE.jsx`](GULZA_AE.jsx) | Membuat komposisi dari lirik di AE atau membaca JSON pengaturan dari browser. |
| CEP | [`GULZA_CEP.zip`](GULZA_CEP.zip) | Menggunakan antarmuka editor browser berbahasa Korea di panel AE. |

### Memasang ScriptUI

1. Unduh `GULZA_AE.jsx`.
2. Letakkan di folder `Scripts/ScriptUI Panels` pada instalasi AE.
3. Mulai ulang AE, lalu buka **Window → GULZA_AE.jsx**.

Pilih lirik, gaya, ukuran layar, dan efek untuk membuat komposisi.

Waktu mulai dapat dihitung otomatis atau mengikuti penanda pada lapisan audio terpilih maupun komposisi.

Anda juga dapat membaca **JSON untuk AE** dari browser untuk membuat komposisi dengan waktu dan pengaturan yang sama.

Lirik yang dihasilkan tetap menjadi lapisan teks yang bisa diedit.

### Memasang CEP

1. Unduh dan ekstrak `GULZA_CEP.zip`.
2. Jalankan `install_win.bat` atau `install_mac.command` sesuai sistem operasi.
3. Mulai ulang AE, lalu buka **Window → Extensions → GULZA**.

CEP ditujukan untuk AE 2022 atau lebih baru. ID ekstensinya (`com.ruruoni1.gulza`) berbeda dari panel JIZURA asli.

Pemasang menyalin panel ke folder ekstensi CEP milik pengguna dan mengaktifkan pengaturan untuk panel CEP tanpa tanda tangan.

Lihat [panduan pemasangan CEP](cep/dist/README_CEP.md) untuk rinciannya.

Kedua panel memiliki pembuatan ringan, kontrol kemajuan/berhenti, dan laporan diagnostik.

After Effects tidak terpasang pada komputer yang digunakan untuk rilis ini, sehingga pengoperasian di dalam AE belum diverifikasi.

## Pengembangan dan Distribusi

Versi browser dibangun dari root repositori sebagai berikut:

```sh
python build.py
```

`src/`, `app/`, `vendor/`dari akar `index.html`kelas `sitemap.xml`menghasilkan.

Halaman GitHub `main` Publikasikan akar repositori cabang. [alamat bawaan](https://ruruoni1.github.io/gulza/id/)adalah layar Korea.

HTML untuk bahasa Jepang, Inggris, Cina (Tradisional, Sederhana), Indonesia, dan Vietnam juga dibuat di setiap folder bahasa.

Alat build asli khusus After Effects juga ada di repositori.

```sh
node tools/export_ae_data.js
python build_ae.py
python build_cep.py
```

Versi browsernya adalah [`VERSION`](VERSION), riwayat perubahannya adalah [`CHANGELOG.md`](CHANGELOG.md)Tuliskan.

Untuk menambahkan bagian ekspresi [`docs/EXPRESSION_PACKS.md`](docs/EXPRESSION_PACKS.md)Silakan merujuk ke.

Jika Anda membuat ulang keluaran AE·CEP, Anda harus memeriksanya secara terpisah di After Effects.

## Pembaruan terbaru

- **v0.16.1:** Situs web kini memiliki gambar pratinjau berbagi per bahasa, favicon, dan data terstruktur, serta deskripsi pencarian yang lebih lengkap.
- **v0.16.0:** Tema di mode sederhana kini dua tingkat: 9 tema utama dan 35 subtema. Subtema menentukan suasana, gaya, dan teknik variasi otomatis serta menyalakan sakelar yang dibutuhkan.
- **v0.15.7:** Baris yang lebih dari 20 karakter (tanpa spasi) kini memunculkan peringatan; lompat ke baris itu untuk memperbaikinya, atau lanjutkan apa adanya.
- **v0.15.6:** Ke-860 nama teknik di halaman Indonesia dan Vietnam kini diterjemahkan, dan nama yang janggal atau ganda dalam bahasa Korea, Inggris, dan Tionghoa diperbaiki.
- **v0.15.5:** Antarmuka Korea kini menampilkan nama Korea untuk 315 teknik yang sebelumnya tampil sebagai kunci bahasa Inggris.
- **v0.15.4:** Pengulangan pratinjau kini mati secara bawaan; tombol Ulang berganti: semua → baris → cut → mati.
- **v0.15.3:** Tombol impor SRT dan pesannya, yang masih berbahasa Jepang di halaman Tionghoa, Indonesia, dan Vietnam, kini diterjemahkan.
- **v0.15.2:** Saat menyimpan proyek, JSON AE, dan LRC, nama file kini bisa diubah; tanpa judul lagu, nama file audio yang dimuat dipakai.
- **v0.15.1:** Jeda di antara subtitle SRT kini hanya menampilkan latar dan dekorasi, tanpa angka hitung mundur.
- **v0.15.0:** Cut ke-2 dan ke-4 pada contoh bawaan bahasa Korea kini lebih lama; urutan dan jumlah cut tetap sama.
- **v0.14.9:** Susunan cut otomatis pada contoh dikembalikan; hanya durasi kalimat yang diatur di antara versi awal dan versi yang lebih lambat.
- **v0.14.8:** Contoh bawaan kini menampilkan setiap kalimat lebih lama dan mengurangi pergantian cut yang terlalu cepat.
- **v0.14.7:** Bilah atas bahasa Indonesia dan Vietnam kini tetap satu baris pada layar desktop meskipun labelnya lebih panjang.
- **v0.14.6:** Kontrol dan tautan di bagian atas kini berada dalam satu baris pada layar lebar. Judul dan tombol panel lirik membungkus dengan rapi pada kolom sempit.
- **v0.14.5:** Pemilih bahasa dipersingkat menjadi `🌐 LN` dan nama bahasa yang dipilih. Tautan GitHub dan GoverseTV kini berada di sisi kanan tombol bilah atas.
- **v0.14.4:** Menambahkan tautan ke repositori GitHub GULZA dan kanal YouTube GoverseTV di bilah atas situs. Di ponsel, buka menu untuk menemukannya.
- **v0.14.3:** Video contoh dalam tujuh bahasa mengikuti kisah yang sama: asal nama GULZA, huruf yang mulai bergerak, takarir yang menjadi adegan, dan kata-kata yang menjadi video.
- **v0.14.2:** Menambahkan video contoh GULZA untuk setiap bahasa. Contoh yang belum diedit ikut berubah saat bahasa antarmuka diganti.
- **v0.14.1:** Melengkapi panduan dalam enam bahasa dan membuat pemilih bahasa lebih mudah ditemukan.
- **v0.14.0:** Menerbitkan kembali situs dalam tujuh bahasa, dengan bahasa Korea sebagai pilihan awal.

[Riwayat lengkap (bahasa Korea)](CHANGELOG.md) · [Rilis GitHub v0.16.1](https://github.com/ruruoni1/gulza/releases/tag/v0.16.1)

## Kontributor dan Lisensi Asli

Proyek ini [852wa/JIZURA](https://github.com/852wa/JIZURA)Ini adalah garpu berdasarkan .

Kami juga mewarisi terjemahan dan kontribusi fitur yang dicatat dalam README asli.

- [Zaious](https://github.com/Zaious): Peningkatan nama layar/bagian, font, dan pengenalan bahasa berbahasa Mandarin
- [andongmin94](https://github.com/andongmin94): Terjemahan layar/nama bagian Korea
- [auliaramadhann](https://github.com/auliaramadhann), [enka25](https://github.com/enka25): terjemahan layar bahasa indonesia
- [nocore-dtm](https://github.com/nocore-dtm): Potong pratinjau, sinkronisasi tab, putar ulang, penggantian individual, dan penguncian
- [phamhuulocforwork](https://github.com/phamhuulocforwork): Terjemahan layar Vietnam

Sumber alatnya adalah [Lisensi MIT](LICENSE)Mengikuti.

Hak atas video dan gambar yang dibuat dengan alat ini adalah milik pencipta. Hak atas subtitle, lirik, dan sumber suara yang digunakan adalah milik pemegang haknya masing-masing.

Subtitle dan audio diproses di browser dan tidak diunggah ke server. Font yang diperlukan diambil dari Google Fonts.

Pemberitahuan perangkat lunak eksternal [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)ada di
