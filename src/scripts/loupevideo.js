// loupevideo.js
// Usage:
//   node loupevideo.js "<URL>" [out.mp4] [fps]
// If you pass only two args ("<URL> 30"), the second is treated as FPS.

const { spawn } = require("child_process");
const path = require("path");
const fetch = global.fetch || ((...args) => import('node-fetch').then(mod => mod.default(...args)));
// --------- args & defaults ----------
const RAW_URL = process.argv[2];
let OUT = process.argv[3];
let FPS = process.argv[4];

if (!RAW_URL) {
  console.error('Usage: node loupevideo.js "<URL>" [out.mp4] [fps]');
  process.exit(1);
}
// If user passed only "<URL> 30", treat "30" as FPS.
if (OUT && /^[0-9]+$/.test(OUT) && !FPS) {
  FPS = OUT;
  OUT = undefined;
}
OUT = OUT || "out.mp4";
FPS = parseInt(FPS || "30", 10);

// --------- helpers ----------
const isM3U8 = (s = "") =>
  /\.m3u8(\?|$)/i.test(s) || /application\/(vnd\.apple\.mpegurl|x-mpegurl)/i.test(s);
const isMP4  = (s = "") =>
  /\.mp4(\?|$)/i.test(s) || /video\/mp4/i.test(s);
const isVideoType = (t = "") => /^video\//i.test(t);
const isImgType   = (t = "") => /^image\//i.test(t);

async function headType(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok ? (r.headers.get("content-type") || "") : "";
  } catch {
    return "";
  }
}

// IMPORTANT: keep query string variants for Vision360-type viewers
function candidatesForFramesBase(u) {
  const list = [];
  // Original URL exactly as-is
  list.push(u);
  // If not already ending with '/', try adding '/'
  if (!u.endsWith("/")) list.push(u + "/");
  // No query (legacy heuristic)
  const noQuery = u.split("#")[0]; // keep before hash
  const qIdx = noQuery.indexOf("?");
  const noQ = qIdx >= 0 ? noQuery.slice(0, qIdx) : noQuery;
  list.push(noQ);
  if (!noQ.endsWith("/")) list.push(noQ + "/");
  // Parent directory (no query)
  const idx = noQ.lastIndexOf("/");
  if (idx > "https://x".length) {
    const parent = noQ.slice(0, idx);
    list.push(parent);
    if (!parent.endsWith("/")) list.push(parent + "/");
  }
  // Special heuristic: Vision360.html?d=XYZ → ensure "<that exact URL>/" is tried
  try {
    const url = new URL(u);
    if (/vision360\.html/i.test(url.pathname) && url.searchParams.get("d")) {
      const special = url.toString();
      if (!special.endsWith("/")) list.unshift(special + "/");
      else list.unshift(special);
    }
  } catch {}
  // De-duplicate while preserving order
  return [...new Set(list)];
}

function startFfmpeg(outFile, fps) {
  const args = [
    "-y", "-loglevel", "error", "-stats",
    "-framerate", String(fps),
    "-f", "image2pipe",
    "-i", "pipe:0",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    outFile,
  ];
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  ff.on("error", e => console.error("ffmpeg spawn error:", e.message));
  return ff;
}

const writeBuf = (writable, buf) =>
  new Promise((resolve, reject) => {
    const ok = writable.write(buf, (err) => (err ? reject(err) : resolve()));
    if (!ok) writable.once("drain", resolve);
  });

// --------- frame detection ----------
async function detectFrames(baseUrlOrList, maxHint = 4096) {
  const pads = [4, 3, 2, 1, 0];
  const exts = ["jpg", "jpeg", "png", "webp"];
  const bases = Array.isArray(baseUrlOrList) ? baseUrlOrList : [baseUrlOrList];
  for (const base0 of bases) {
    // keep whatever we received (may include query), ensure also a trailing '/'
    const variants = base0.endsWith("/") ? [base0] : [base0, base0 + "/"];
    for (const base of variants) {
      for (const pad of pads) {
        for (const start of [1, 0]) {
          for (const ext of exts) {
            const idx = String(start).padStart(pad, "0");
            const probe = `${base}${idx}.${ext}`;
            const t = await headType(probe);
            if (isImgType(t)) {
              // find last index (grow + binary search)
              let lo = start, hi = start || 1;
              while (true) {
                const u = `${base}${String(hi).padStart(pad, "0")}.${ext}`;
                const tt = await headType(u);
                if (!isImgType(tt)) break;
                lo = hi;
                hi = hi ? hi * 2 : 2;
                if (hi > maxHint) break;
              }
              let L = lo, R = hi;
              while (L + 1 < R) {
                const mid = Math.floor((L + R) / 2);
                const u = `${base}${String(mid).padStart(pad, "0")}.${ext}`;
                const tt = await headType(u);
                if (isImgType(tt)) L = mid; else R = mid;
              }
              return { prefix: base, pad, ext, start, end: L };
            }
          }
        }
      }
    }
  }
  return null;
}

async function streamFrames(pattern, ffmpegStdin) {
  const { prefix, pad, ext, start, end } = pattern;
  const total = end - start + 1;
  let sent = 0;
  for (let i = start; i <= end; i++) {
    const name = String(i).padStart(pad, "0");
    const url = `${prefix}${name}.${ext}`;
    try {
      const r = await fetch(url);
      if (!r.ok) { console.warn(`Skip ${url}: HTTP ${r.status}`); continue; }
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      if (!ct.startsWith("image/")) { console.warn(`Skip ${url}: ${ct}`); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length) { console.warn(`Skip ${url}: empty`); continue; }
      await writeBuf(ffmpegStdin, buf);
      sent++;
      if (sent % 20 === 0 || i === end) process.stdout.write(`Frames pushed: ${sent}/${total}\r`);
    } catch (e) {
      console.warn(`Skip ${url}: ${e.message}`);
    }
  }
  process.stdout.write(`Frames pushed: ${sent}/${total}\n`);
  return sent;
}

// --------- Loupe fallback: extract cert_id & GraphQL ----------
function extractLoupeCertId(u) {
  try {
    const url = new URL(u);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("diamond");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {}
  return null;
}
async function fetchV360FromGraphQL(certId) {
  const endpoint = "https://integrations.nivoda.net/graphql-loupe360";
  const body = {
    query: `
      query ($cert_id: ID!) {
        certificate: certificate_by_cert_id(cert_id: $cert_id) {
          v360 { url frame_count top_index }
          product_videos { url loupe360_url type display_index }
        }
      }
    `,
    variables: { cert_id: certId },
  };
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GraphQL HTTP ${r.status}`);
  const j = await r.json();
  if (j.errors) throw new Error("GraphQL errors: " + JSON.stringify(j.errors));
  return j.data.certificate?.v360?.url || null;
}

// --------- main ----------
(async () => {
  try {
    console.log("Probing:", RAW_URL);
    // 1) Try direct video first
    const r0 = await fetch(RAW_URL);
    const finalUrl = r0.url;
    const type0 = (r0.headers.get("content-type") || "").toLowerCase();
    r0.body && r0.body.cancel && r0.body.cancel();
    if (isM3U8(finalUrl) || isM3U8(type0)) {
      console.log("HLS detected → ffmpeg copy to", OUT);
      await new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", [
          "-y","-loglevel","error","-stats",
          "-user_agent","Mozilla/5.0",
          "-i", finalUrl,
          "-c","copy",
          OUT
        ], { stdio: "inherit" });
        ff.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
        ff.on("error", reject);
      });
      console.log("Saved:", path.resolve(OUT));
      return;
    }
    if (isMP4(finalUrl) || isMP4(type0) || isVideoType(type0)) {
      console.log("MP4/video detected → downloading to", OUT);
      const r = await fetch(finalUrl);
      if (!r.ok) throw new Error(`HTTP ${r.status} on ${finalUrl}`);
      await new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", [
          "-y","-loglevel","error","-stats",
          "-i","pipe:0",
          "-c","copy",
          OUT
        ], { stdio: ["pipe", "inherit", "inherit"] });
        ff.on("error", reject);
        ff.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
        r.body.pipe(ff.stdin);
        r.body.on("error", reject);
      });
      console.log("Saved:", path.resolve(OUT));
      return;
    }
    // 2) Try frame detection around the final URL (now keeps query!)
    console.log("Not a direct video. Trying frame detection…");
    const bases = candidatesForFramesBase(finalUrl);
    let pattern = await detectFrames(bases, 4096);
    // 3) If still not found and it's a Loupe diamond URL, fall back to GraphQL → v360.url
    if (!pattern) {
      const certId = extractLoupeCertId(finalUrl);
      if (certId) {
        console.log("Local detection failed. Extracted cert_id:", certId, "→ querying GraphQL for v360.url…");
        const v360Url = await fetchV360FromGraphQL(certId);
        if (v360Url) {
          pattern = await detectFrames([v360Url], 4096);
        }
      }
    }
    if (!pattern) {
      throw new Error("Could not detect a frame sequence for this URL.");
    }
    console.log("Detected frame sequence:", pattern, "fps:", FPS);
    // 4) Stream frames → ffmpeg
    const ff = startFfmpeg(path.resolve(OUT), FPS);
    const pushed = await streamFrames(pattern, ff.stdin);
    ff.stdin.end();
    if (pushed === 0) {
      ff.kill("SIGKILL");
      throw new Error("No frames were streamed; aborting.");
    }
    await new Promise((resolve, reject) => {
      ff.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
    });
    console.log("\nDone →", path.resolve(OUT));
  } catch (err) {
    console.error("Error:", err.message || err);
    console.error("\nTips:");
    console.error("- Ensure ffmpeg is installed and in PATH (ffmpeg -version).");
    console.error("- For vv360 Vision360.html?d=..., this version keeps the query and tries '<url>/' as the frame base.");
    console.error("- If a host blocks HEAD, we can switch detection to tiny GET probes.");
  }
})();
