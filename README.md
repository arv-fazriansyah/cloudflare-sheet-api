---

## 📄 Cloudflare Worker: Spreadsheet ke JSON/TSV dengan Query

Worker ini digunakan untuk mengambil data dari **Google Spreadsheet yang dipublikasikan**, lalu mengubahnya menjadi **JSON** atau **TSV**. Mendukung **filter via query string**.

---

### 🚀 Fitur Utama

* Mengambil data dari Google Spreadsheet publik
* Output otomatis: **JSON** atau **TSV**
* Filter data dengan parameter URL (contoh: `?nama=Andi`)
* Cocok untuk kebutuhan:

  * API ringan
  * Data publik
  * Embed ke aplikasi frontend

---

### 🧩 Setup Spreadsheet Google

1. **Buka** Google Spreadsheet yang ingin digunakan.
2. Klik menu: **File → Bagikan → Publikasikan ke web**
3. Pilih:

   * **Publikasikan seluruh dokumen**
   * Format: **Nilai dipisahkan tab (.tsv)**
4. Klik **Mulai publikasi**
5. Salin **ID spreadsheet** dari URL yang dipublikasikan:

   Contoh URL:

   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=tsv
   ```

   Contoh ID:

   ```
   2PACX-1vTXiWabcDEFgHijKlmno12345678pqRS9TUVXYZ
   ```

---

### ⚙️ Deploy ke Cloudflare Workers

#### 1. Buat Akun & Worker

* Daftar/login ke [Cloudflare](https://dash.cloudflare.com)
* Navigasi ke: **Workers & Pages → Create Application → Create Worker**

#### 2. Tempelkan Kode Worker

* Hapus kode default
* Tempelkan isi dari file `worker.js` atau `index.js`

#### 3. Tambah Environment Variable

* Masuk ke tab **Settings → Variables**
* Tambahkan variabel:

  | Name   | Value                             |
  | ------ | --------------------------------- |
  | `data` | `2PACX-1vTXiWabcDEFgHijKlm...XYZ` |

#### 4. Simpan dan Deploy

* Klik **Save and Deploy**
* Salin URL Worker (misal: `https://your-worker-url.workers.dev`)

---

### 🔧 Konfigurasi Worker

Edit bagian berikut pada fungsi `handleRequest()`:

```js
const sheetConfigs = {
  data: {
    id: env.data,   // ID spreadsheet dari env var
    gid: "0",       // GID sheet (lihat dari URL Spreadsheet)
    range: "A:Z",   // Range kolom yang diambil
    output: "json"  // json atau tsv
  }
};
```

> 💡 Gunakan Environment Variables untuk menyimpan ID agar aman dan fleksibel.

---

### 🔍 Contoh Penggunaan

#### 1. Ambil semua data:

```
https://your-worker-url.workers.dev/data
```

#### 2. Filter berdasarkan query (misal, nama):

```
https://your-worker-url.workers.dev/data?nama=Andi
```

#### 3. Output sebagai TSV:

* Ubah `output: "tsv"` pada `sheetConfigs`
* Maka respons akan berupa file `.tsv`

---

### 🧪 Contoh Struktur JSON Otomatis

Misal isi spreadsheet:

| NAMA | KELAS | JK |
| ---- | ----- | -- |
| Andi | 6A    | L  |

Query:

```
https://your-worker-url.workers.dev/data?nama=Andi
```

Output JSON:

```json
[
  {
    "NAMA": "Andi",
    "KELAS": "6A",
    "JK": "L"
  }
]
```

Query lain:

```
https://your-worker-url.workers.dev/data?kelas=6A
```

Output JSON:

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

MIT License — Bebas digunakan untuk keperluan pribadi maupun komersial.

---
