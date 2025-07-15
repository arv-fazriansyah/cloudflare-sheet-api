// =========================
// 🚀 Handler Utama
// =========================
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const [_, shortId] = url.pathname.split("/");

  const sheetConfigs = {
    data: {
      id: env.data,
      gid: "0",
      range: "A:Z",
      output: "json",
      enabled: false
    }
  };

  if (!shortId) {
    return jsonResponse([
      {
        email: "arvib@fariansyah.eu.org",
        github: "https://github.com/arv-fazriansyah"
      }
    ]);
  }

  const config = sheetConfigs[shortId];

  if (!config) {
    return jsonResponse([{ message: `Path '${shortId}' tidak valid.` }], 404);
  }

  if (!config.enabled && !url.searchParams.toString()) {
    return jsonResponse([{ message: "Akses ke data ini dinonaktifkan." }], 403);
  }

  const tsvUrl = `https://docs.google.com/spreadsheets/d/e/${config.id}/pub?gid=${config.gid}&range=${config.range}&single=true&output=tsv`;

  try {
    const resp = await fetch(tsvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/tab-separated-values',
        'Cache-Control': 'no-cache'
      }
    });

    if (!resp.ok) throw new Error('Gagal mengambil data dari Google Spreadsheet.');

    const rawTSV = await resp.text();
    let data = tsvToJson(rawTSV);

    const query = url.searchParams;
    if (query.toString()) {
      const filtered = filterData(data, query);
      data = filtered.length ? filtered : [{ message: "Data tidak ditemukan!" }];
    }

    return config.output === 'tsv'
      ? tsvResponse(jsonToTsv(data), shortId)
      : jsonResponse(data);

  } catch (err) {
    return jsonResponse([{ message: `Error: ${err.message}` }], 500);
  }
}

// =========================
// 🔧 Utilitas
// =========================

const parseSpecialValue = val => {
  if (!val) return val;
  if (val.startsWith("[arr]")) return val.slice(5).split(";").map(v => v.trim()).filter(Boolean);
  if (val.startsWith("[obj]")) {
    return val.slice(5).split(";").reduce((obj, part) => {
      const [k, v] = part.split(":").map(s => s.trim());
      if (k && v !== undefined) obj[k] = v;
      return obj;
    }, {});
  }
  return val.trim();
};

const tsvToJson = tsv => {
  const [headerLine, ...lines] = tsv.trim().split("\n");
  const headers = headerLine.split("\t").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split("\t");
    return headers.reduce((row, header, idx) => {
      row[header] = parseSpecialValue(cols[idx]?.trim() || "");
      return row;
    }, {});
  });
};

const jsonToTsv = data => {
  const headers = Object.keys(data[0]);
  const rows = data.map(item =>
    headers.map(h => {
      const val = item[h];
      if (Array.isArray(val)) return `[arr] ${val.join("; ")}`;
      if (val && typeof val === "object") return `[obj] ${Object.entries(val).map(([k, v]) => `${k}: ${v}`).join("; ")}`;
      return val ?? "";
    }).join("\t")
  );
  return [headers.join("\t"), ...rows].join("\n");
};

const filterData = (data, query) => {
  const entries = [...query.entries()];
  return data.filter(row => entries.every(([k, v]) => row[k.toUpperCase()] === v));
};

// JSON Response with CORS
const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });

// TSV Response with CORS
const tsvResponse = (tsv, name, status = 200) =>
  new Response(tsv, {
    status,
    headers: {
      "Content-Type": "text/tab-separated-values",
      "Content-Disposition": `attachment; filename=${name}.tsv`,
      "Access-Control-Allow-Origin": "*"
    }
  });

// 🌐 Cloudflare Worker entry point
export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};
