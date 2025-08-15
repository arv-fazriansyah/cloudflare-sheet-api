export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const authHeader = request.headers.get("Authorization") || "";

    // Cek Bearer token
    if (!authHeader.startsWith("Bearer ") || authHeader.slice(7) !== env.API_TOKEN) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    if (request.method !== "POST") {
      return jsonRes({ error: "Gunakan POST untuk /post atau /update" }, 405);
    }

    const body = await request.json();

    // Ambil credential Google Service Account
    const creds = JSON.parse(env.GOOGLE_CREDENTIALS);
    const jwt = await createJWT(creds.client_email, creds.private_key);
    const token = await getAccessToken(jwt);

    const spreadsheetId = body.spreadsheetId || env.SPREADSHEET_ID;
    const sheetName = body.sheetName || "DATA";

    // Ambil data sheet untuk header
    const sheetData = await fetchSheetData(spreadsheetId, sheetName, token);
    if (!sheetData || sheetData.length === 0) {
      return jsonRes({ error: "Sheet kosong atau tidak ditemukan" }, 404);
    }

    const headersRow = sheetData[0];
    const headerMap = headersRow.map(h => h.trim().toLowerCase());

    if (path === "/post") return await handlePost(body, headerMap, sheetName, spreadsheetId, token);
    if (path === "/update") return await handleUpdate(body, headerMap, sheetData, sheetName, spreadsheetId, token);

    return jsonRes({ error: "Path tidak valid" }, 404);
  },
};

// ===== HELPERS =====
async function fetchSheetData(spreadsheetId, sheetName, token) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.values || [];
}

async function handlePost(body, headerMap, sheetName, spreadsheetId, token) {
  const skipKeys = ["spreadsheetid", "sheetname", "findby"];
  const newRow = headerMap.map(h => {
    const key = Object.keys(body).find(k => k.trim().toLowerCase() === h);
    return key && !skipKeys.includes(h) ? body[key] : "";
  });

  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(sheetUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [newRow] }),
  });
  return new Response(await res.text(), { headers: corsHeaders() });
}

async function handleUpdate(body, headerMap, sheetData, sheetName, spreadsheetId, token) {
  if (!body.findBy) return jsonRes({ error: "findBy wajib diisi untuk update" }, 400);

  const findKeys = Object.keys(body.findBy).map(k => k.trim().toLowerCase());
  const rowIndex = sheetData.findIndex((row, i) => {
    if (i === 0) return false;
    return findKeys.every(k => {
      const idx = headerMap.indexOf(k);
      if (idx === -1) return false;
      const val = body.findBy[Object.keys(body.findBy).find(key => key.trim().toLowerCase() === k)];
      return (row[idx] || "").toString().toLowerCase() === val.toString().toLowerCase();
    });
  });

  if (rowIndex === -1) return jsonRes({ error: "Data tidak ditemukan" }, 404);

  const skipKeys = ["spreadsheetid", "sheetname", "findby"];
  const updates = Object.keys(body).filter(k => !skipKeys.includes(k.trim().toLowerCase()));
  if (updates.length === 0) return jsonRes({ error: "Tidak ada kolom untuk diupdate" }, 400);

  // Batch update
  const values = updates.map(key => {
    const colIndex = headerMap.indexOf(key.trim().toLowerCase());
    if (colIndex === -1) return null;
    return {
      range: `${sheetName}!${columnLetter(colIndex + 1)}${rowIndex + 1}`,
      values: [[body[key]]],
    };
  }).filter(Boolean);

  if (values.length === 0) return jsonRes({ error: "Tidak ada kolom valid untuk diupdate" }, 400);

  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  await fetch(batchUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ valueInputOption: "RAW", data: values }),
  });

  return jsonRes({ success: true, updated: updates });
}

function columnLetter(col) {
  let letter = "";
  while (col > 0) {
    let rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

// ===== JWT GOOGLE =====
async function createJWT(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = { iss: clientEmail, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", exp, iat };
  const encoder = new TextEncoder();
  const toBase64 = obj => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    str2ab(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = `${toBase64(header)}.${toBase64(payload)}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(data));
  return `${data}.${arrayBufferToBase64(signature)}`;
}

async function getAccessToken(jwt) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

function str2ab(str) {
  if (!str || typeof str !== "string") throw new Error("Private key tidak ditemukan atau formatnya salah");
  const cleaned = str.replace(/-----.*-----/g, "").replace(/\n/g, "");
  const binary = atob(cleaned);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
