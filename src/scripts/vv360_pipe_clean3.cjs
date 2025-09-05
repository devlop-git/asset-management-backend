// vv360_pipe_clean3.cjs
// VV360 → MP4 without saving frames; hides UI and actively advances frames.
// Usage: node vv360_pipe_clean3.cjs "<VV360 URL>" [out.mp4] [durationSeconds] [fps]

const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const URL_INPUT  = process.argv[2];
const OUT        = process.argv[3] || "out.mp4";
const DURATION_S = parseInt(process.argv[4] || "15", 10);
const FPS        = parseInt(process.argv[5] || "30", 10);

if (!URL_INPUT) {
  console.error('Usage: node vv360_pipe_clean3.cjs "<VV360 URL>" [out.mp4] [durationSeconds] [fps]');
  process.exit(1);
}

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const plat = process.platform, c = [];
  if (plat === "win32") c.push(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe"
  );
  else if (plat === "darwin") c.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  );
  else c.push(
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  );
  return c.find(p => fs.existsSync(p));
}
const chromePath = findChrome();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const even  = (n) => (n % 2 === 0 ? n : n + 1);

async function getCanvasBox(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".V360-canvas");
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
}

async function hideOverlays(page) {
  const css = `
    .sliderHeight, .zoomslide, .frameContainerslider, .vertical, .zoomLable,
    #plus1, #minus1, .imgplus, .imgminus, #eyescan, .hidemodel,
    .buttons, .btnpos, .btninfo, #ty, #trfv, .divbtnpos,
    #watermark, #FixedWaterMark, .position1, .position9,
    .V360-preload, .tooltipstered, .allimages,
    [class*="watermark"], [id*="watermark"]
      { display:none !important; visibility:hidden !important; opacity:0 !important; }
    .V360-canvas, canvas.V360-canvas, .V360-canvasimg {
      outline:none !important; box-shadow:none !important; background:transparent !important; z-index:1 !important;
    }
    .big, .frameContainer, .V360-instance, .bigframe, .V360-stage,
    .sliderHeight, .buttons, .btnpos, .btninfo, .position1, .position9 {
      pointer-events:none !important;
    }
  `;
  await page.addStyleTag({ content: css });
}

async function startSpinPumper(page, clip) {
  return page.evaluate(({ cx, cy }) => {
    document.querySelector("#autoPlay")?.click();
    const canvas = document.querySelector(".V360-canvas");
    const next   = document.querySelector("#next");
    function dragOnce() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = rect.left + rect.width * 0.35;
      const sy = rect.top  + rect.height * 0.5;
      const ex = rect.left + rect.width * 0.65;
      const ey = sy;
      const dispatch = (type, x, y) => {
        canvas.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, buttons: 1
        }));
      };
      dispatch("mouseenter", sx, sy);
      dispatch("mousemove",  sx, sy);
      dispatch("mousedown",  sx, sy);
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const x = sx + ((ex - sx) * i) / steps;
        const y = sy + ((ey - sy) * i) / steps;
        dispatch("mousemove", x, y);
      }
      dispatch("mouseup", ex, ey);
      dispatch("mouseleave", ex, ey);
    }
    const interval = setInterval(() => {
      if (next) { next.click(); }
      else { dragOnce(); }
    }, 66);
    let tick = 0;
    const keepAlive = setInterval(() => {
      tick++;
      if (tick % 60 === 0) { document.querySelector("#pause")?.click(); }
      if (tick % 60 === 5) { document.querySelector("#pause")?.click(); }
    }, 100);
    window.__vv360StopPumper = () => {
      clearInterval(interval);
      clearInterval(keepAlive);
      delete window.__vv360StopPumper;
    };
    return true;
  }, { cx: clip.x + clip.width/2, cy: clip.y + clip.height/2 });
}

async function stopSpinPumper(page) {
  try { await page.evaluate(() => window.__vv360StopPumper?.()); } catch {}
}

async function isCanvasAdvancing(page, clip) {
  const tiny = {
    x: clip.x + Math.max(5, Math.floor(clip.width * 0.05)),
    y: clip.y + Math.floor(clip.height * 0.5) - 5,
    width: Math.min(clip.width - 10, 80),
    height: 10
  };
  const a = await page.screenshot({ type: "png", clip: tiny, encoding: "base64", captureBeyondViewport: false });
  await sleep(300);
  const b = await page.screenshot({ type: "png", clip: tiny, encoding: "base64", captureBeyondViewport: false });
  return a !== b;
}

function startFfmpeg(outFile, fps) {
  const args = [
    "-y","-loglevel","error","-stats",
    "-framerate", String(fps),
    "-f","image2pipe",
    "-vcodec","png",
    "-i","pipe:0",
    "-vf","pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1",
    "-c:v","libx264",
    "-pix_fmt","yuv420p",
    "-crf","18",
    outFile
  ];
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  ff.on("error", e => console.error("ffmpeg spawn error:", e.message));
  return ff;
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1600,1000",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--mute-audio",
        `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36`,
      ],
    });
    const page = await browser.newPage();
    await page.goto(URL_INPUT, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(1200);
    await hideOverlays(page);
    let box = await getCanvasBox(page);
    for (let i = 0; (!box || !box.width || !box.height) && i < 6; i++) {
      await page.reload({ waitUntil: "networkidle2" });
      await sleep(1200);
      await hideOverlays(page);
      box = await getCanvasBox(page);
    }
    if (!box || !box.width || !box.height) throw new Error("V360 canvas not found or has zero size.");
    await startSpinPumper(page, box);
    for (let tries = 0; tries < 10; tries++) {
      if (await isCanvasAdvancing(page, box)) break;
      await sleep(200);
      if (tries === 9) console.warn("Warning: canvas still looks static; proceeding anyway.");
    }
    const clipW = even(box.width);
    const clipH = even(box.height);
    console.log(`Canvas clip: ${clipW}x${clipH} at (${box.x},${box.y})`);
    const ff = startFfmpeg(path.resolve(OUT), FPS);
    const writeBuf = (buf) =>
      new Promise((resolve, reject) => {
        const ok = ff.stdin.write(buf, (err) => (err ? reject(err) : resolve()));
        if (!ok) ff.stdin.once("drain", resolve);
      });
    const total = Math.max(1, Math.round(DURATION_S * FPS));
    console.log(`Streaming ${total} frames @ ${FPS} fps…`);
    for (let i = 0; i < total; i++) {
      const buf = await page.screenshot({
        type: "png",
        clip: { x: box.x, y: box.y, width: clipW, height: clipH },
        captureBeyondViewport: false,
        omitBackground: false,
        encoding: "binary",
      });
      await writeBuf(buf);
      await sleep(1000 / FPS);
      if ((i + 1) % 30 === 0 || i + 1 === total) {
        process.stdout.write(`Frames pushed: ${i + 1}/${total}\r`);
      }
    }
    process.stdout.write("\n");
    await stopSpinPumper(page);
    ff.stdin.end();
    await new Promise((resolve, reject) => {
      ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    });
    console.log(`Video saved to ${path.resolve(OUT)}`);
    await browser.close();
  } catch (e) {
    try { await browser?.close(); } catch {}
    console.error("Error:", e.message || e);
    console.error("Try:");
    console.error("- Increase duration/fps (last 2 args).");
    console.error("- If still static, bump the click/drag rate: set interval in startSpinPumper() to 33ms.");
    console.error("- If overlay reappears, tell me its selector to add to the hide list.");
    process.exit(1);
  }
})();
