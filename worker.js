async function handleRequest(request, env) {
    const url = new URL(request.url);
    const shortId = url.pathname.split("/")[1];

    // Menentukan ID Spreadsheet beserta gid, range, dan output formatnya
    const sheetConfigs = {
        "data": { id: env.data, gid: "0", range: "A:Z", output: "json" }
    };

    const sheetConfig = sheetConfigs[shortId];
    if (!sheetConfig) return jsonResponse([{ message: "Path tidak valid!" }], 404);

    const { id: sheetId, gid, range, output } = sheetConfig;

    // Membuat URL permintaan untuk mengakses data TSV dari Google Sheets (tersembunyi dari pengguna)
    const tsvUrl = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?gid=${gid}&range=${range}&single=true&output=tsv`;

    try {
        // Melakukan permintaan ke Google Sheets secara internal menggunakan Cloudflare IP
        const response = await fetch(tsvUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36', // Menyembunyikan permintaan asli
                'Accept': 'text/tab-separated-values', // Menerima TSV
                'Cache-Control': 'no-cache' // Menghindari cache
            }
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const tsvText = await response.text();
        const jsonData = tsvToJson(tsvText);

        // Mendapatkan parameter query dari URL
        const queryParams = url.searchParams;

        // Jika tidak ada query parameter, kembalikan semua data
        let dataToReturn = jsonData;

        // Filter data berdasarkan parameter query jika ada
        if (queryParams.toString()) {
            const filteredData = filterData(jsonData, queryParams);
            dataToReturn = filteredData.length ? filteredData : [{ message: "Data tidak ditemukan!" }];
        }

        // Jika output = tsv, konversi data JSON ke TSV dan kirimkan sebagai file dengan ekstensi .tsv
        if (output === 'tsv') {
            const tsvOutput = jsonToTsv(dataToReturn);
            return tsvResponse(tsvOutput, shortId);  // Menggunakan path untuk nama file
        }

        // Jika output = json atau tidak ada output, kembalikan data dalam format JSON
        return jsonResponse(dataToReturn);

    } catch (error) {
        return jsonResponse([{ message: "Error: " + error.message }], 500);
    }
}

// Fungsi untuk mengonversi TSV ke JSON
function tsvToJson(tsv) {
    const lines = tsv.trim().split("\n");
    const headers = lines[0].split("\t").map(header => header.trim()); // Konversi header sekali saja

    return lines.slice(1).map(line => {
        const data = line.split("\t");
        return headers.reduce((obj, header, index) => {
            obj[header] = data[index]?.trim() || ""; // Trim data saat memasukkan
            return obj;
        }, {});
    });
}

// Fungsi untuk mengonversi JSON ke TSV
function jsonToTsv(data) {
    const headers = Object.keys(data[0]);
    const tsv = [headers.join("\t")]; // Tambahkan header

    data.forEach(item => {
        const row = headers.map(header => item[header] || ""); // Pastikan setiap kolom ada, jika kosong tambahkan string kosong
        tsv.push(row.join("\t"));
    });

    return tsv.join("\n");
}

// Fungsi untuk memfilter data berdasarkan query params
function filterData(data, queryParams) {
    const queryEntries = Array.from(queryParams.entries());
    return data.filter(item => queryEntries.every(([key, value]) => {
        const itemValue = item[key.toUpperCase()];
        return itemValue && itemValue === value; // Membandingkan tanpa mengubah menjadi huruf kecil
    }));
}


// Fungsi untuk mengembalikan respons JSON
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

// Fungsi untuk mengembalikan respons TSV dengan ekstensi .tsv
function tsvResponse(data, path, status = 200) {
    const filename = `${path}.tsv`; // Nama file sesuai dengan path yang diminta

    return new Response(data, {
        status,
        headers: {
            "Content-Type": "text/tab-separated-values",
            "Content-Disposition": `attachment; filename=${filename}` // Menyimpan sebagai file dengan nama berdasarkan path
        }
    });
}

// Fungsi default untuk menangani request di Cloudflare Worker
export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};
