---

## 📄 Spreadsheet ke JSON / TSV API dengan Cloudflare Worker — Lengkap dengan Query Parameter

Buat **REST API ringan dari Google Spreadsheet** hanya dengan Cloudflare Worker. Script ini mengubah spreadsheet publik menjadi **data JSON atau TSV** yang dapat difilter dengan **parameter URL**.

---

### 🚀 Fitur Utama

✅ Mengubah **Google Spreadsheet publik** menjadi **API JSON atau TSV**<br>
✅ Mendukung **query parameter** seperti `?nama=Andi` untuk filter data<br>
✅ Output otomatis sesuai kebutuhan: **JSON** *(default)* atau **TSV**<br>
✅ Dapat digunakan untuk:<br>

  * Menyediakan data publik berbasis spreadsheet
  * Backend ringan tanpa server (serverless)
  * Aplikasi pendidikan, data sekolah, atau data statistik
  * Integrasi langsung ke frontend HTML, React, dsb.

---

### 🔧 Cara Menggunakan Google Spreadsheet sebagai Sumber API

1. Buka Google Spreadsheet yang ingin digunakan
2. Klik tombol **Bagikan** (kanan atas)
3. Ubah setelan menjadi:

   * **Siapa saja yang memiliki link**
   * Akses: **Sebagai Pelihat**
4. Salin **ID spreadsheet** dari URL, contoh:

```
https://docs.google.com/spreadsheets/d/15j2EfsDVTBJ6xLlnCqi3Nn1R52FSCrHWp6G1FgXXxnE/edit?usp=sharing
```

ID Spreadsheet (contoh):

```
15j2EfsDVTBJ6xLlnCqi3Nn1R52FSCrHWp6G1FgXXxnE
```
---

### ⚙️ Cara Deploy ke Cloudflare Worker

#### 1. Buat Worker di Cloudflare

* Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com)
* Pilih: **Workers & Pages → Create Application → Create Worker**

#### 2. Tempelkan Script

* Hapus kode bawaan
* Salin script dari `worker.js`

#### 3. Tambah Environment Variable

Masuk ke tab: **Settings → Variables**

| Nama   | Nilai (Value)                                  |
| ------ | ---------------------------------------------- |
| `data` | `15j2EfsDVTBJ6xLlnCqi3Nn1R52FSCrHWp6G1FgXXxnE` |

#### 4. Deploy

* Klik **Save and Deploy**
* Salin URL akhir Worker, misal:
  `https://your-worker-url.workers.dev`

---

### ⚙️ Konfigurasi Kode Worker

```js
const sheetConfigs = {
  "data": {         // Ganti "data" sesuai kebutuhan untuk Endpoint Anda
    id: env.data,   // ID spreadsheet (disimpan di Environment Variable)
    gid: "0",       // GID dari sheet (lihat di URL Google Sheets)
    range: "A:Z",   // Kolom yang akan diambil
    output: "json", // Format output default: json atau tsv
    enabled: false, // Jika false → endpoint ini tidak aktif

    // 🔓 Hilangkan atau kosongkan ini agar semua query diizinkan
    // allowedParams: ["token", "id", "gid"]
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

---

### 🛡️ Lisensi

Lisensi: **MIT** — Bebas digunakan untuk proyek pribadi, pendidikan, maupun komersial.

---
