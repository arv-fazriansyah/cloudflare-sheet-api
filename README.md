---

## 📄 Spreadsheet ke JSON / TSV API dengan Cloudflare Worker — Lengkap dengan Query Parameter

Buat **REST API ringan dari Google Spreadsheet** hanya dengan Cloudflare Worker. Script ini mengubah spreadsheet publik menjadi **data JSON atau TSV** yang dapat difilter dengan **parameter URL**.

---

### 🚀 Fitur Utama

✅ Mengubah **Google Spreadsheet publik** menjadi **API JSON atau TSV**
✅ Mendukung **query parameter** seperti `?nama=Andi` untuk filter data
✅ Output otomatis sesuai kebutuhan: **JSON** *(default)* atau **TSV**
✅ Dapat digunakan untuk:

* Menyediakan data publik berbasis spreadsheet
* Backend ringan tanpa server (serverless)
* Aplikasi pendidikan, data sekolah, atau data statistik
* Integrasi langsung ke frontend HTML, React, dsb.

---

### 🔧 Cara Menggunakan Google Spreadsheet sebagai Sumber API

1. Buka Google Spreadsheet yang ingin digunakan
2. Klik: **File → Bagikan → Publikasikan ke web**
3. Pilih:

   * **Seluruh dokumen**
   * Format: **Nilai dipisahkan tab (.tsv)**
4. Klik **Mulai Publikasi**
5. Salin **ID spreadsheet** dari URL, contoh:

```
https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=tsv
```

ID Spreadsheet (contoh):

```
2PACX-1vTXiWabcDEFgHijKlmno12345678pqRS9TUVXYZ
```

---

### ⚙️ Cara Deploy ke Cloudflare Worker

#### 1. Buat Worker di Cloudflare

* Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com)
* Pilih: **Workers & Pages → Create Application → Create Worker**

#### 2. Tempelkan Script

* Hapus kode bawaan
* Salin script dari `worker.js` atau `index.js`

#### 3. Tambah Environment Variable

Masuk ke tab: **Settings → Variables**

| Nama   | Nilai (Value)                     |
| ------ | --------------------------------- |
| `data` | `2PACX-1vTXiWabcDEFgHijKlm...XYZ` |

#### 4. Deploy

* Klik **Save and Deploy**
* Salin URL akhir Worker, misal:
  `https://your-worker-url.workers.dev`

---

### ⚙️ Konfigurasi Kode Worker

Ubah konfigurasi berikut:

```js
const sheetConfigs = {
  data: {
    id: env.data,   // ID spreadsheet
    gid: "0",       // GID dari sheet (lihat di URL Google Sheets)
    range: "A:Z",   // Kolom yang akan diambil
    output: "json"  // json atau tsv
  }
};
```

---

### 🔍 Contoh Penggunaan API

#### ✅ Ambil semua data:

```
https://your-worker-url.workers.dev/data
```

#### 🔎 Filter berdasarkan kolom (misal: nama):

```
https://your-worker-url.workers.dev/data?nama=Andi
```

#### 📝 Output sebagai TSV:

* Ubah `output: "tsv"` pada konfigurasi
* Maka hasil akan dalam format `.tsv`

---

### 🧪 Contoh Hasil JSON Otomatis

Spreadsheet:

| NAMA | KELAS | JK |
| ---- | ----- | -- |
| Andi | 6A    | L  |

Query:

```
https://your-worker-url.workers.dev/data?nama=Andi
```

Hasil:

```json
[
  {
    "NAMA": "Andi",
    "KELAS": "6A",
    "JK": "L"
  }
]
```

Query lain (multi hasil):

```
https://your-worker-url.workers.dev/data?kelas=6A
```

```json
[
  {
    "NAMA": "Andi",
    "KELAS": "6A",
    "JK": "L"
  },
  {
    "NAMA": "Siska",
    "KELAS": "6A",
    "JK": "P"
  }
]
```

---

### 🛡️ Lisensi

Lisensi: **MIT** — Bebas digunakan untuk proyek pribadi, pendidikan, maupun komersial.

---
