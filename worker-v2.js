export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.slice(1).split("/");
  const shortId = pathParts[0];
  const searchParams = url.searchParams;

  // 📁 Konfigurasi sheet per ID
  const sheetConfigs = {
    data: {
      id: env.data, // Ganti sesuai kebutuhan atau pakai env.data
      sheetName: "DATAUSER",
      range: "A:Z",
      output: "json", // "json" atau "tsv"
      enabled: true,
      query: "SELECT *",
      // allowedParams: ["token", "id", "gid"], // kosongkan untuk izinkan semua
    }
  };

  if (!shortId || shortId === "") {
    return jsonResponse([
      {
        email: "arvib@fariansyah.eu.org",
        github: "https://github.com/arv-fazriansyah",
      },
    ]);
  }

  const config = sheetConfigs[shortId];
  if (!config) {
    return jsonResponse({ error: "Sheet config not found" }, 404);
  }

  if (!config.enabled) {
    return jsonResponse({ error: "Endpoint is disabled" }, 403);
  }

  // 🔐 Allowed query param
  if (config.allowedParams && config.allowedParams.length > 0) {
    for (const key of searchParams.keys()) {
      if (!config.allowedParams.includes(key)) {
        return jsonResponse({ error: `Parameter '${key}' not allowed` }, 403);
      }
    }
  }

  const query = searchParams.get("q") || config.query || "SELECT *";
  const output = config.output || "json";

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${config.id}/gviz/tq?sheet=${encodeURIComponent(config.sheetName)}&range=${config.range}&tq=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(sheetUrl);
    const text = await response.text();
    const data = parseSheetData(text);

    const filtered = filterData(data, searchParams);

    if (output === "json") {
      return jsonResponse(filtered);
    } else if (output === "tsv") {
      const tsv = convertArrayToTSV(filtered);
      const filename = `${searchParams.get("filename") || shortId}.tsv`;
      return new Response(tsv, {
        headers: {
          "Content-Type": "text/tab-separated-values",
          "Content-Disposition": `attachment; filename=${filename}`,
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      return jsonResponse({ error: "Invalid output format" }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 🔎 Konversi response Google Sheets ke array of objects
function parseSheetData(resText) {
  const jsonData = JSON.parse(resText.substring(47).slice(0, -2));
  const cols = jsonData.table.cols.map(col => col.label || `COL${col.index}`);
  const rows = jsonData.table.rows;

  return rows.map(row => {
    const obj = {};
    row.c.forEach((cell, i) => {
      let value = cell ? cell.v : "";

      // 👇 Parsing [arr] dan [obj]
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.startsWith("[arr]")) {
          value = trimmed.replace("[arr]", "").split(/[\n;]/).map(s => s.trim()).filter(Boolean);
        } else if (trimmed.startsWith("[obj]")) {
          try {
            value = JSON.parse(trimmed.replace("[obj]", "").trim());
          } catch (e) {
            value = trimmed;
          }
        }
      }

      obj[cols[i] || `COL${i}`] = value;
    });
    return obj;
  });
}

// 🔍 Filter data berdasarkan parameter selain 'q'
function filterData(data, queryParams) {
  const filters = Array.from(queryParams.entries()).filter(([key]) => key !== "q" && key !== "filename");
  return data.filter(item =>
    filters.every(([key, value]) => {
      const itemValue = item[key.toUpperCase()];
      return itemValue !== undefined && String(itemValue).toLowerCase() === value.toLowerCase();
    })
  );
}

// 🔄 Ubah array ke TSV
function convertArrayToTSV(dataArray) {
  if (!dataArray.length) return "";
  const headers = Object.keys(dataArray[0]);
  const rows = dataArray.map(row =>
    headers.map(h => (row[h] ?? "").toString().replace(/\t/g, " ")).join("\t")
  );
  return [headers.join("\t"), ...rows].join("\n");
}

// 📦 JSON response helper
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
