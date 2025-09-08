// vv360_batch_processor.cjs
// Processes multiple VV360 URLs and generates MP4 videos for each
const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Your URLs to process
const URLS = [
  "https://www.kgdiamonds.com/products/N0207481/N0207481/2",
  "https://app.raplab.com/ReportCheck/Viewer/V360.aspx?d=1471208",
  "https://v360.diamonds/c/e903e681-5c66-45ff-9f40-b552eb48ef77?m=d&a=B20778",
  "https://diamondvideohosting.com/Video/MH-71B-87A/video.mp4",
  "https://nivoda-inhousemedia.s3.amazonaws.com/inhouse-360-6117790152"
];

const DURATION_S = parseInt(process.argv[2] || "15", 10);
const FPS = parseInt(process.argv[3] || "30", 10);

// ---- optional Chrome discovery ----
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

// ---- helpers ----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const even = (n) => (n % 2 === 0 ? n : n + 1);

async function getCanvasBox(page) {
  return page.evaluate(() => {
    // Try multiple selectors for different VV360 implementations
    const selectors = [
      ".V360-canvas",
      "canvas",
      ".v360-canvas",
      "#v360-canvas",
      ".diamond-canvas",
      ".viewer-canvas"
    ];
    
    let el = null;
    for (const selector of selectors) {
      el = document.querySelector(selector);
      if (el) break;
    }
    
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
    [class*="watermark"], [id*="watermark"],
    .header, .footer, .navbar, .menu, .toolbar,
    .controls, .control-panel, .ui-element,
    .ad, .banner, .popup, .modal,
    .close-button, .exit-button, .skip-button
      { display:none !important; visibility:hidden !important; opacity:0 !important; }
    .V360-canvas, canvas.V360-canvas, .V360-canvasimg, canvas {
      outline:none !important; box-shadow:none !important; background:transparent !important; z-index:9999 !important;
    }
    .big, .frameContainer, .V360-instance, .bigframe, .V360-stage,
    .sliderHeight, .buttons, .btnpos, .btninfo, .position1, .position9 {
      pointer-events:none !important;
    }
    body, html { overflow: hidden !important; }
  `;
  await page.addStyleTag({ content: css });
}

async function startSpinPumper(page, clip) {
  return page.evaluate(({ cx, cy }) => {
    // Try multiple strategies to start rotation
    const strategies = [
      () => document.querySelector("#autoPlay")?.click(),
      () => document.querySelector(".autoplay")?.click(),
      () => document.querySelector(".play-button")?.click(),
      () => document.querySelector("[data-action='play']")?.click(),
      () => document.querySelector("button").click() // fallback
    ];

    for (const strategy of strategies) {
      try {
        strategy();
        break;
      } catch (e) {}
    }

    const canvas = document.querySelector(".V360-canvas") || document.querySelector("canvas");
    const next = document.querySelector("#next") || document.querySelector(".next-button");

    function dragOnce() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = rect.left + rect.width * 0.35;
      const sy = rect.top + rect.height * 0.5;
      const ex = rect.left + rect.width * 0.65;
      const ey = sy;

      const dispatch = (type, x, y) => {
        canvas.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, buttons: 1
        }));
      };
      dispatch("mouseenter", sx, sy);
      dispatch("mousemove", sx, sy);
      dispatch("mousedown", sx, sy);
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

    window.__vv360StopPumper = () => {
      clearInterval(interval);
      delete window.__vv360StopPumper;
    };
    return true;
  }, { cx: clip.x + clip.width / 2, cy: clip.y + clip.height / 2 });
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
    "-y", "-loglevel", "error", "-stats",
    "-framerate", String(fps),
    "-f", "image2pipe",
    "-vcodec", "png",
    "-i", "pipe:0",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    outFile
  ];
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  ff.on("error", e => console.error("ffmpeg spawn error:", e.message));
  return ff;
}

function sanitizeFilename(url) {
  // Extract meaningful name from URL
  const urlObj = new URL(url);
  let name = urlObj.pathname.split('/').pop() || 
             urlObj.searchParams.get('d') || 
             urlObj.searchParams.get('m') || 
             'video';
  
  // Remove special characters
  name = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return name.substring(0, 50); // Limit length
}

async function processUrl(browser, url, index) {
  const page = await browser.newPage();
  let outputFile = `${sanitizeFilename(url)}_${index}.mp4`;
  
  console.log(`\nProcessing ${index + 1}/${URLS.length}: ${url}`);
  console.log(`Output: ${outputFile}`);

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(2000);

    await hideOverlays(page);

    // Locate canvas
    let box = await getCanvasBox(page);
    for (let i = 0; (!box || !box.width || !box.height) && i < 6; i++) {
      await page.reload({ waitUntil: "networkidle2" });
      await sleep(2000);
      await hideOverlays(page);
      box = await getCanvasBox(page);
    }

    if (!box || !box.width || !box.height) {
      console.warn(`Canvas not found for ${url}, skipping...`);
      await page.close();
      return null;
    }

    // Start rotation
    await startSpinPumper(page, box);
    for (let tries = 0; tries < 10; tries++) {
      if (await isCanvasAdvancing(page, box)) break;
      await sleep(200);
      if (tries === 9) console.warn("Warning: canvas still looks static; proceeding anyway.");
    }

    // Prepare ffmpeg
    const clipW = even(box.width);
    const clipH = even(box.height);
    console.log(`Canvas: ${clipW}x${clipH}`);
    const ff = startFfmpeg(outputFile, FPS);
    const writeBuf = (buf) =>
      new Promise((resolve, reject) => {
        const ok = ff.stdin.write(buf, (err) => (err ? reject(err) : resolve()));
        if (!ok) ff.stdin.once("drain", resolve);
      });

    // Record
    const total = Math.max(1, Math.round(DURATION_S * FPS));
    console.log(`Capturing ${total} frames...`);
    
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
        process.stdout.write(`Frames: ${i + 1}/${total}\r`);
      }
    }
    process.stdout.write("\n");

    // Cleanup
    await stopSpinPumper(page);
    ff.stdin.end();
    
    await new Promise((resolve, reject) => {
      ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    });

    console.log(`✓ Completed: ${outputFile}`);
    await page.close();
    return outputFile;

  } catch (error) {
    console.error(`Error processing ${url}:`, error.message);
    await page.close();
    return null;
  }
}

(async () => {
  let browser;
  const results = [];

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

    console.log(`Processing ${URLS.length} URLs...`);
    
    for (let i = 0; i < URLS.length; i++) {
      const result = await processUrl(browser, URLS[i], i);
      results.push(result);
      
      // Brief pause between URLs
      if (i < URLS.length - 1) {
        await sleep(1000);
      }
    }

    console.log("\n=== Processing Complete ===");
    console.log("Generated files:");
    results.filter(Boolean).forEach(file => console.log(`  - ${file}`));

  } catch (error) {
    console.error("Fatal error:", error.message);
  } finally {
    if (browser) await browser.close();
  }
})();