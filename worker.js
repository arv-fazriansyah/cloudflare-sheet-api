// Fungsi utama untuk menangani request
async function handleRequest(request, env) { 
    const url = new URL(request.url);
    const shortId = url.pathname.split("/")[1];

    // Konfigurasi spreadsheet dan range-nya
    const sheetConfigs = {
        "data": { id: env.data, gid: "0", range: "A:Z", output: "json" }
    };

    const sheetConfig = sheetConfigs[shortId];
    if (!sheetConfig) return jsonResponse([{ message: "Path tidak valid!" }], 404);

    const { id: sheetId, gid, range, output } = sheetConfig;

    const tsvUrl = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?gid=${gid}&range=${range}&single=true&output=tsv`;

    try {
        const response = await fetch(tsvUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'text/tab-separated-values',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const tsvText = await response.text();
        const jsonData = tsvToJson(tsvText);

        const queryParams = url.searchParams;
        let dataToReturn = jsonData;

        if (queryParams.toString()) {
            const filteredData = filterData(jsonData, queryParams);
            dataToReturn = filteredData.length ? filteredData : [{ message: "Data tidak ditemukan!" }];
        }

        if (output === 'tsv') {
            const tsvOutput = jsonToTsv(dataToReturn);
            return tsvResponse(tsvOutput, shortId);
        }

        return jsonResponse(dataToReturn);

    } catch (error) {
        return jsonResponse([{ message: "Error: " + error.message }], 500);
    }
}

// ===========================
// 🔧 UTILITAS
// ===========================

// Fungsi mengenali nilai khusus [arr] dan [obj]
function parseSpecialValue(value) {
    if (!value) return value;

    if (value.startsWith("[arr]")) {
        return value
            .replace("[arr]", "")
            .split(";")
            .map(v => v.trim())
            .filter(Boolean);
    }

    if (value.startsWith("[obj]")) {
        const parts = value.replace("[obj]", "").split(";").map(v => v.trim());
        const obj = {};
        parts.forEach(part => {
            const [key, val] = part.split(":").map(s => s.trim());
            if (key && val !== undefined) obj[key] = val;
        });
        return obj;
    }

    return value.trim();
}

// Konversi TSV ke JSON
function tsvToJson(tsv) {
    const lines = tsv.trim().split("\n");
    const headers = lines[0].split("\t").map(header => header.trim());

    return lines.slice(1).map(line => {
        const data = line.split("\t");
        return headers.reduce((obj, header, index) => {
            const rawValue = data[index]?.trim() || "";
            obj[header] = parseSpecialValue(rawValue);
            return obj;
        }, {});
    });
}

// Konversi JSON ke TSV (array & obj akan dikonversi kembali ke string dengan tag)
function jsonToTsv(data) {
    const headers = Object.keys(data[0]);
    const tsv = [headers.join("\t")];

    data.forEach(item => {
        const row = headers.map(header => {
            const val = item[header];
            if (Array.isArray(val)) {
                return `[arr] ${val.join("; ")}`;
            } else if (typeof val === "object" && val !== null) {
                return `[obj] ` + Object.entries(val).map(([k, v]) => `${k}: ${v}`).join("; ");
            } else {
                return val || "";
            }
        });
        tsv.push(row.join("\t"));
    });

    return tsv.join("\n");
}

// Filter berdasarkan query string (case sensitive, uppercase key)
function filterData(data, queryParams) {
    const queryEntries = Array.from(queryParams.entries());
    return data.filter(item => queryEntries.every(([key, value]) => {
        const itemValue = item[key.toUpperCase()];
        return itemValue && itemValue === value;
    }));
}

// Respons JSON
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

// Respons TSV file
function tsvResponse(data, path, status = 200) {
    const filename = `${path}.tsv`;
    return new Response(data, {
        status,
        headers: {
            "Content-Type": "text/tab-separated-values",
            "Content-Disposition": `attachment; filename=${filename}`
        }
    });
}

// Default handler
export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};
