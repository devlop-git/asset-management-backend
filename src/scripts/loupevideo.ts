import { spawn } from "child_process";
import * as path from "path";
import fs from "fs";
// import fetch, { Response } from "node-fetch"; // or global.fetch if using Node 18+
import fetch from "node-fetch";

export const processVideo = async (RAW_URL: string, OUT: string = "out.mp4", FPS: number = 30): Promise<void> => {
  FPS = parseInt(String(FPS), 10);

  console.log("Processing video:", RAW_URL, "to", OUT, "at", FPS, "fps...");

  const isM3U8 = (s = ""): boolean =>
    /\.m3u8(\?|$)/i.test(s) || /application\/(vnd\.apple\.mpegurl|x-mpegurl)/i.test(s);

  const isMP4 = (s = ""): boolean =>
    /\.mp4(\?|$)/i.test(s) || /video\/mp4/i.test(s);

  const isVideoType = (t = ""): boolean => /^video\//i.test(t);

  const isImgType = (t = ""): boolean => /^image\//i.test(t);

  async function headType(url: string): Promise<string> {
    try {
      const r = await fetch(url, { method: "HEAD" });
      return r.ok ? (r.headers.get("content-type") || "") : "";
    } catch {
      return "";
    }
  }

  function candidatesForFramesBase(u: string): string[] {
    const list: string[] = [];
    list.push(u);
    if (!u.endsWith("/")) list.push(u + "/");
    const noQuery = u.split("#")[0];
    const qIdx = noQuery.indexOf("?");
    const noQ = qIdx >= 0 ? noQuery.slice(0, qIdx) : noQuery;
    list.push(noQ);
    if (!noQ.endsWith("/")) list.push(noQ + "/");
    const idx = noQ.lastIndexOf("/");
    if (idx > "https://x".length) {
      const parent = noQ.slice(0, idx);
      list.push(parent);
      if (!parent.endsWith("/")) list.push(parent + "/");
    }
    try {
      const url = new URL(u);
      if (/vision360\.html/i.test(url.pathname) && url.searchParams.get("d")) {
        const special = url.toString();
        if (!special.endsWith("/")) list.unshift(special + "/");
        else list.unshift(special);
      }
    } catch {}
    return [...new Set(list)];
  }

  function startFfmpeg(outFile: string, fps: number) {
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

  const writeBuf = (writable: NodeJS.WritableStream, buf: Buffer): Promise<void> =>
    new Promise((resolve, reject) => {
      const ok = writable.write(buf, (err) => (err ? reject(err) : resolve()));
      if (!ok) writable.once("drain", resolve);
    });

  interface FramePattern {
    prefix: string;
    pad: number;
    ext: string;
    start: number;
    end: number;
  }

  async function detectFrames(baseUrlOrList: string | string[], maxHint = 4096): Promise<FramePattern | null> {
    const pads = [4, 3, 2, 1, 0];
    const exts = ["jpg", "jpeg", "png", "webp"];
    const bases = Array.isArray(baseUrlOrList) ? baseUrlOrList : [baseUrlOrList];
    for (const base0 of bases) {
      const variants = base0.endsWith("/") ? [base0] : [base0, base0 + "/"];
      for (const base of variants) {
        for (const pad of pads) {
          for (const start of [1, 0]) {
            for (const ext of exts) {
              const idx = String(start).padStart(pad, "0");
              const probe = `${base}${idx}.${ext}`;
              const t = await headType(probe);
              if (isImgType(t)) {
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

  async function streamFrames(pattern: FramePattern, ffmpegStdin: NodeJS.WritableStream): Promise<number> {
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
      } catch (e: any) {
        console.warn(`Skip ${url}: ${e.message}`);
      }
    }
    process.stdout.write(`Frames pushed: ${sent}/${total}\n`);
    return sent;
  }

  function extractLoupeCertId(u: string): string | null {
    try {
      const url = new URL(u);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("diamond");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    } catch {}
    return null;
  }

  async function fetchV360FromGraphQL(certId: string): Promise<string | null> {
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
    const j:any = await r.json();
    if (j.errors) throw new Error("GraphQL errors: " + JSON.stringify(j.errors));
    return j.data.certificate?.v360?.url || null;
  }

  try {
    console.log("Probing:", RAW_URL);
    const r0:any = await fetch(RAW_URL);
    const finalUrl = r0.url;
    const type0 = (r0.headers.get("content-type") || "").toLowerCase();
    if (r0.body && "cancel" in r0.body) {
      r0.body.cancel();
    }

    if (isM3U8(finalUrl) || isM3U8(type0)) {
      console.log("HLS detected → ffmpeg copy to", OUT);
      await new Promise<void>((resolve, reject) => {
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
      await new Promise<void>((resolve, reject) => {
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

    console.log("Not a direct video. Trying frame detection…");
    const bases = candidatesForFramesBase(finalUrl);
    let pattern = await detectFrames(bases, 4096);

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
    const ff = startFfmpeg(path.resolve(OUT), FPS);
    const pushed = await streamFrames(pattern, ff.stdin);
    ff.stdin.end();
    if (pushed === 0) {
      ff.kill("SIGKILL");
      throw new Error("No frames were streamed; aborting.");
    }
    await new Promise<void>((resolve, reject) => {
      ff.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
    });

    console.log("\nDone →", path.resolve(OUT));
  } catch (err: any) {
    console.error("Error:", err.message || err);
    console.error("\nTips:");
    console.error("- Ensure ffmpeg is installed and in PATH (ffmpeg -version).");
    console.error("- For vv360 Vision360.html?d=..., this version keeps the query and tries '<url>/' as the frame base.");
    console.error("- If a host blocks HEAD, we can switch detection to tiny GET probes.");
  }
};
