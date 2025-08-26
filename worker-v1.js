// =============================
// 🔰 Fungsi Utama
// =============================
async function handleRequest(request, env) {
    const url = new URL(request.url);
    const shortId = url.pathname.split("/")[1];
  
    // =============================
    // 🔧 Konfigurasi Per Short ID
    // =============================
    const sheetConfigs = {
      "data": {
        id: env.data,
        gid: "0",
        range: "A:Z",
        output: "json",
        enabled: false,
     // 🔓 Hilangkan atau kosongkan ini agar semua query diizinkan
     // allowedParams: ["token", "id", "gid"]
      }
    };
  
    // ✅ Info default jika path kosong
    if (!shortId || shortId === "") {
      return jsonResponse([
        {
          email: "arvib@fariansyah.eu.org",
          github: "https://github.com/arv-fazriansyah"
        }
      ]);
    }
  
    const sheetConfig = sheetConfigs[shortId];
    if (!sheetConfig) {
      return jsonResponse([{ message: `Path { ${shortId} } tidak valid.` }], 404);
    }
  
    // ❗Tolak jika sheet nonaktif dan tidak ada query
    if (!sheetConfig.enabled && !url.search) {
      return jsonResponse([{ message: "Akses ke data ini dinonaktifkan." }], 403);
    }
  
    // ✅ Validasi parameter hanya yang diizinkan
    if (sheetConfig.allowedParams && sheetConfig.allowedParams.length) {
      const allowedSet = new Set(sheetConfig.allowedParams);
      const invalidParams = [...url.searchParams.keys()].filter(key => !allowedSet.has(key));
      if (invalidParams.length) {
        return jsonResponse([{ message: `Parameter { ${invalidParams.join(", ")} } tidak diizinkan.` }], 400);
      }
    }
  
    const { id: sheetId, gid, range, output } = sheetConfig;
    //const tsvUrl = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?gid=${gid}&range=${range}&single=true&output=tsv`; #error
    const tsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv&gid=${gid}&range=${range}`;
  
    try {
      const response = await fetch(tsvUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/tab-separated-values',
          'Cache-Control': 'no-cache'
        }
      });
  
      if (!response.ok) throw new Error("Gagal mengambil data dari Google Spreadsheet.");
      const tsvText = await response.text();
      const jsonData = tsvToJson(tsvText);
  
      const queryParams = url.searchParams;
      let dataToReturn = jsonData;
  
      // 🔍 Filter jika ada query
      if (queryParams.toString()) {
        const filtered = filterData(jsonData, queryParams);
        dataToReturn = filtered.length ? filtered : [{ message: "Data tidak ditemukan!" }];
      }
  
      // 📦 Output TSV jika diminta
      if (output === "tsv") {
        const tsvOutput = jsonToTsv(dataToReturn);
        return tsvResponse(tsvOutput, shortId);
      }
  
      // 📦 Default JSON
      return jsonResponse(dataToReturn);
  
    } catch (error) {
      return jsonResponse([{ message: error.message }], 500);
    }
  }
  
  // =============================
  // 🔧 UTILITAS
  // =============================
  
  function parseSpecialValue(value) {
    if (!value) return value;
    if (value.startsWith("[arr]")) {
      return value.replace("[arr]", "")
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
  
  function tsvToJson(tsv) {
    const lines = tsv.trim().split("\n");
    const headers = lines[0].split("\t").map(h => h.trim());
  
    return lines.slice(1).map(line => {
      const row = line.split("\t");
      return headers.reduce((obj, header, i) => {
        const raw = row[i]?.trim() || "";
        obj[header] = parseSpecialValue(raw);
        return obj;
      }, {});
    });
  }
  
  function jsonToTsv(data) {
    const headers = Object.keys(data[0] || {});
    const tsv = [headers.join("\t")];
  
    data.forEach(item => {
      const row = headers.map(header => {
        const val = item[header];
        if (Array.isArray(val)) return `[arr] ${val.join("; ")}`;
        if (typeof val === "object" && val !== null)
          return `[obj] ` + Object.entries(val).map(([k, v]) => `${k}: ${v}`).join("; ");
        return val || "";
      });
      tsv.push(row.join("\t"));
    });
  
    return tsv.join("\n");
  }
  
  function filterData(data, queryParams) {
    const entries = Array.from(queryParams.entries());
    return data.filter(item => entries.every(([key, value]) => {
      const itemValue = item[key.toUpperCase()];
      return itemValue && itemValue === value;
    }));
  }
  
  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  function tsvResponse(data, filename, status = 200) {
    return new Response(data, {
      status,
      headers: {
        "Content-Type": "text/tab-separated-values",
        "Content-Disposition": `attachment; filename=${filename}.tsv`,
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // =============================
  // 🌐 Handler Cloudflare Worker
  // =============================
  export default {
    async fetch(request, env) {
      return handleRequest(request, env);
    }
  };
  
