## 📄 Spreadsheet to JSON/TSV via Cloudflare Worker + Query

Cloudflare Worker ini digunakan untuk mengambil data dari **Google Spreadsheet** yang dipublikasikan, lalu mengubahnya menjadi **JSON** atau **TSV**. Worker ini juga mendukung **filtering (query)** berdasarkan parameter URL.

---

### 🚀 Fitur Utama

* Mengambil data dari Spreadsheet Google yang dipublikasikan
* Output otomatis dalam format **JSON** atau **TSV**
* Dapat difilter menggunakan **query parameter** seperti `?NAMA=Andi`
* Cocok untuk kebutuhan **API ringan**, **data publik**, atau **embed data ke aplikasi**

---

### 🧩 Langkah-langkah Setup Spreadsheet

1. **Buka Google Spreadsheet** yang ingin Anda jadikan sumber data.
2. Klik menu **"File" → "Bagikan" → "Publikasikan ke web"**.
3. Pada pilihan:

   * **Publikasikan seluruh dokumen**
   * Pilih format: **Nilai dipisahkan tab (.tsv)**
4. Klik tombol **"Mulai publikasi"**.
5. Setelah dipublikasikan, salin **ID Spreadsheet yang dipublikasikan**:

   * Contoh ID: `2PACX-1vTXiWabcDEFgHijKlmno12345678pqRS9TUVXYZ`
   * ID diambil dari URL yang bentuknya seperti:
     `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?...`

---

### ⚙️ Konfigurasi Cloudflare Worker

Pada file `handleRequest()`, Anda bisa menambahkan konfigurasi spreadsheet di bagian ini:

```javascript
const sheetConfigs = {
  "data": {
    id: env.data, // disesuaikan di Environment Variables di Cloudflare
    gid: "0",      // GID sheet (bisa dilihat dari URL Spreadsheet)
    range: "A:Z",  // Kolom yang ingin diambil
    output: "json" // Bisa "json" atau "tsv"
  }
};
```

> ⚠️ Pastikan ID spreadsheet disimpan di Environment Variable (misalnya: `data`) agar aman dan mudah diatur.

---

### 🔍 Contoh Penggunaan

#### 1. Ambil seluruh data:

```
https://your-worker-url.workers.dev/data
```

#### 2. Filter berdasarkan nama (query parameter):

```
https://your-worker-url.workers.dev/data?nama=Andi
```

#### 3. Dapatkan output dalam bentuk file `.tsv`:

Atur `output: "tsv"` di konfigurasi `sheetConfigs`, maka respons akan diunduh sebagai file.

---

### 🧪 Struktur Data JSON Otomatis

Format JSON mengikuti header dari baris pertama di Spreadsheet.

Contoh:

| NAMA | KELAS | JK |
| ---- | ----- | -- |
| Andi | 6A    | L  |

```
https://your-worker-url.workers.dev/data?nama=Andi
```
Output:

```json
[
  {
    "NAMA": "Andi",
    "KELAS": "6A",
    "JK": "L"
  }
]
```
```
https://your-worker-url.workers.dev/data?kelas=6A
```
Output:

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

MIT — Bebas digunakan untuk kebutuhan pribadi atau komersial.

---

Jika kamu butuh API data cepat dari Google Sheets ke JSON/TSV tanpa backend — ini solusinya!
Deploy di Cloudflare Workers, gratis dan cepat!
