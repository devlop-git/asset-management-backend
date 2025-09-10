// vv360_enhanced_standalone.cjs
// Enhanced VV360 capture with better canvas detection and error handling
const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// URLs to process
const URLS = [
  // "https://www.kgdiamonds.com/products/N0207481/N0207481/2",
  // "https://app.raplab.com/ReportCheck/Viewer/V360.aspx?d=1471208",
  // "https://v360.diamonds/c/e903e681-5c66-45ff-9f40-b552eb48ef77?m=d&a=B20778",
  // "https://diamondvideohosting.com/Video/MH-71B-87A/video.mp4",
  // "https://nivoda-inhousemedia.s3.amazonaws.com/inhouse-360-6117790152"
  // "https://loupe360.com/diamond/aae74e3f-0c72-558d-b6c3-b21f00e76379/video/500/500?d_id=4f48ca55-1454-488b-8d17-4df81f7530d5&c_id=fb0c4d1a-520a-4cfc-9111-c0b50913cc8f&f_id=1&type=api"
];

// Configuration
const DEBUG_MODE = process.argv.includes('--debug');
const DURATION_S = parseInt(process.argv.find(arg => arg.startsWith('--duration='))?.split('=')[1] || "15", 10);
const FPS = parseInt(process.argv.find(arg => arg.startsWith('--fps='))?.split('=')[1] || "30", 10);
const OUTPUT_DIR = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || "vv360_output";

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---- Chrome discovery ----
function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  
  const plat = process.platform;
  const paths = [];
  
  if (plat === "win32") {
    paths.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Chromium\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
      process.env.PROGRAMFILES + "\\Google\\Chrome\\Application\\chrome.exe",
      process.env['PROGRAMFILES(X86)'] + "\\Google\\Chrome\\Application\\chrome.exe"
    );
  } else if (plat === "darwin") {
    paths.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable"
    );
  } else {
    paths.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium"
    );
  }
  
  return paths.find(p => fs.existsSync(p));
}

// ---- Helpers ----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const even = (n) => (n % 2 === 0 ? n : n + 1);

// Enhanced canvas detection
async function findCanvas(page, url) {
  console.log(`🔍 Looking for canvas elements on ${url}`);
  
  // Wait for page to fully load
  await sleep(3000);
  
  // Try multiple strategies to find the canvas
  const canvasInfo = await page.evaluate(() => {
    const selectors = [
      'canvas',
      '.V360-canvas',
      '.v360-canvas',
      '#v360-canvas',
      '.diamond-canvas',
      '.viewer-canvas',
      '.threejs-canvas',
      '.webgl-canvas',
      '[class*="canvas"]',
      '[id*="canvas"]',
      '[class*="360"]',
      '[id*="360"]',
      '[class*="viewer"]',
      '[id*="viewer"]',
      '[class*="three"]',
      '[id*="three"]',
      '[class*="webgl"]',
      '[id*="webgl"]'
    ];
    
    const results = [];
    
    // Try each selector
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 100) {
            results.push({
              selector,
              tagName: el.tagName,
              width: rect.width,
              height: rect.height,
              left: rect.left,
              top: rect.top,
              visible: rect.width > 0 && rect.height > 0
            });
          }
        }
      } catch (e) {
        // Ignore errors with specific selectors
      }
    }
    
    // Look for video elements
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        results.push({
          selector: 'video',
          tagName: video.tagName,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          visible: rect.width > 0 && rect.height > 0
        });
      }
    }
    
    // Look for iframes that might contain the viewer
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const rect = iframe.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        results.push({
          selector: 'iframe',
          tagName: iframe.tagName,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          visible: rect.width > 0 && rect.height > 0,
          src: iframe.src
        });
      }
    }
    
    return results;
  });
  
  if (DEBUG_MODE) {
    console.log("Canvas detection results:", JSON.stringify(canvasInfo, null, 2));
  }
  
  // Find the best candidate (largest visible element)
  let bestCandidate = null;
  for (const candidate of canvasInfo) {
    if (candidate.visible) {
      const area = candidate.width * candidate.height;
      if (!bestCandidate || area > (bestCandidate.width * bestCandidate.height)) {
        bestCandidate = candidate;
      }
    }
  }
  
  if (bestCandidate) {
    console.log(`✅ Found candidate: ${bestCandidate.selector} (${bestCandidate.width}x${bestCandidate.height})`);
    return {
      x: Math.round(bestCandidate.left),
      y: Math.round(bestCandidate.top),
      width: Math.round(bestCandidate.width),
      height: Math.round(bestCandidate.height),
      type: bestCandidate.tagName.toLowerCase()
    };
  }
  
  // Fallback: try to find the largest element in the viewport
  console.log("Trying fallback element detection...");
  const largestElement = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    let largest = null;
    let maxArea = 0;
    
    for (const el of allElements) {
      try {
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        
        // Skip elements that are too small or not visible
        if (area > 30000 && rect.width > 100 && rect.height > 100 && 
            rect.width > 0 && rect.height > 0 && 
            window.getComputedStyle(el).display !== 'none' &&
            window.getComputedStyle(el).visibility !== 'hidden') {
          if (area > maxArea) {
            maxArea = area;
            largest = {
              tagName: el.tagName,
              className: el.className,
              id: el.id,
              width: rect.width,
              height: rect.height,
              left: rect.left,
              top: rect.top
            };
          }
        }
      } catch (e) {
        // Ignore errors with specific elements
      }
    }
    
    return largest;
  });
  
  if (largestElement) {
    console.log(`✅ Fallback found: ${largestElement.tagName} (${largestElement.width}x${largestElement.height})`);
    return {
      x: Math.round(largestElement.left),
      y: Math.round(largestElement.top),
      width: Math.round(largestElement.width),
      height: Math.round(largestElement.height),
      type: largestElement.tagName.toLowerCase()
    };
  }
  
  console.log("❌ No suitable canvas/element found");
  return null;
}

// Enhanced overlay hiding
async function hideOverlays(page) {
  const css = `
    /* VV360 specific elements */
    .sliderHeight, .zoomslide, .frameContainerslider, .vertical, .zoomLable,
    #plus1, #minus1, .imgplus, .imgminus, #eyescan, .hidemodel,
    .buttons, .btnpos, .btninfo, #ty, #trfv, .divbtnpos,
    #watermark, #FixedWaterMark, .position1, .position9,
    .V360-preload, .tooltipstered, .allimages,
    [class*="watermark"], [id*="watermark"],
    
    /* General UI elements that might obscure the view */
    .header, .footer, .navbar, .menu, .toolbar, .banner,
    .controls, .control-panel, .ui-element, .ad-container,
    .ad, .banner, .popup, .modal, .cookie-consent,
    .close-button, .exit-button, .skip-button, .notification,
    
    /* Social media and sharing buttons */
    .social-share, .share-buttons, .like-button,
    
    /* Loading indicators */
    .loading, .spinner, .loader,
    
    /* Navigation elements */
    .navigation, .nav, .menu-toggle,
    
    /* Specific to diamond sites */
    .diamond-info, .product-info, .price-tag, .buy-button,
    .add-to-cart, .wishlist, .compare,
    
    /* Chat widgets */
    .chat-widget, .live-chat, .support-chat
      { display: none !important; visibility: hidden !important; opacity: 0 !important; }
    
    /* Make canvas/video elements prominent */
    .V360-canvas, canvas.V360-canvas, .V360-canvasimg, canvas, video,
    .v360-viewer, .diamond-viewer, .webgl-container
      { outline: none !important; box-shadow: none !important; 
        background: transparent !important; z-index: 9999 !important; }
    
    /* Disable pointer events on containers */
    .big, .frameContainer, .V360-instance, .bigframe, .V360-stage,
    .sliderHeight, .buttons, .btnpos, .btninfo, .position1, .position9
      { pointer-events: none !important; }
    
    /* Remove scrollbars and ensure full visibility */
    body, html { overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
  `;
  
  await page.addStyleTag({ content: css });
  console.log("✅ Overlays hidden");
}

// Start rotation mechanism
async function startRotation(page, clip) {
  console.log("🔄 Starting rotation...");
  
  return page.evaluate(async (clip) => {
    // Try multiple strategies to start rotation
    const clickSelectors = [
      "#autoPlay", ".autoplay", ".play-button", "[data-action='play']",
      ".start-rotation", ".rotate-button", ".play", ".start"
    ];
    
    for (const selector of clickSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        element.click();
        console.log(`Clicked ${selector}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      }
    }
    
    // Set up continuous rotation
    const canvas = document.querySelector('canvas') || document.querySelector('video');
    let rotationInterval;
    
    if (canvas) {
      // Simulate drag events for WebGL canvases
      rotationInterval = setInterval(() => {
        const rect = canvas.getBoundingClientRect();
        const startX = rect.left + rect.width * 0.3;
        const startY = rect.top + rect.height * 0.5;
        const endX = rect.left + rect.width * 0.7;
        const endY = startY;
        
        // Dispatch mouse events to simulate drag
        const events = [
          new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }),
          new MouseEvent('mousemove', { clientX: startX, clientY: startY, bubbles: true })
        ];
        
        // Add intermediate move events for smoother rotation
        for (let i = 1; i <= 5; i++) {
          const x = startX + (endX - startX) * (i / 5);
          events.push(new MouseEvent('mousemove', { clientX: x, clientY: endY, bubbles: true }));
        }
        
        events.push(
          new MouseEvent('mousemove', { clientX: endX, clientY: endY, bubbles: true }),
          new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true })
        );
        
        events.forEach(event => canvas.dispatchEvent(event));
      }, 100); // Rotate every 100ms
    }
    
    window.__vv360RotationInterval = rotationInterval;
    return true;
  }, clip);
}

// Stop rotation
async function stopRotation(page) {
  await page.evaluate(() => {
    if (window.__vv360RotationInterval) {
      clearInterval(window.__vv360RotationInterval);
    }
    
    // Try to pause any playing media
    const videos = document.querySelectorAll('video');
    videos.forEach(video => video.pause());
  });
}

// Check if content is advancing
async function isContentAdvancing(page, clip, previousImage = null) {
  if (clip.type === 'video') {
    // For videos, check if they're playing
    const isPlaying = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused && !video.ended && video.readyState > 2;
    });
    return isPlaying;
  }
  
  // For canvases, compare screenshots
  const tinyClip = {
    x: clip.x + Math.max(5, Math.floor(clip.width * 0.05)),
    y: clip.y + Math.floor(clip.height * 0.5) - 5,
    width: Math.min(clip.width - 10, 80),
    height: 10
  };
  
  const currentImage = await page.screenshot({ 
    type: "png", 
    clip: tinyClip, 
    encoding: "base64", 
    captureBeyondViewport: false 
  });
  
  if (!previousImage) {
    await sleep(300);
    return isContentAdvancing(page, clip, currentImage);
  }
  
  return currentImage !== previousImage;
}

// Start FFmpeg process
function startFfmpeg(outFile, fps, width, height) {
  const args = [
    "-y", "-loglevel", "error", "-stats",
    "-framerate", String(fps),
    "-f", "image2pipe",
    "-vcodec", "png",
    "-i", "pipe:0",
    "-vf", `pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1,scale=${width}:${height}`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    outFile
  ];
  
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  ff.on("error", e => console.error("FFmpeg error:", e.message));
  return ff;
}

// Sanitize filename
function sanitizeFilename(url) {
  try {
    const urlObj = new URL(url);
    let name = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_') + '_' + 
               urlObj.pathname.split('/').filter(Boolean).join('_');
    
    // Remove special characters and limit length
    name = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    return name || 'vv360_capture';
  } catch {
    return 'vv360_capture';
  }
}

// Process a single URL
async function processUrl(browser, url, index) {
  const page = await browser.newPage();
  const outputFile = path.join(OUTPUT_DIR, `${sanitizeFilename(url)}_${index}.mp4`);
  
  console.log(`\n📦 Processing ${index + 1}/${URLS.length}: ${url}`);
  console.log(`💾 Output: ${outputFile}`);
  
  try {
    // Set larger viewport
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    
    // Navigate to URL with longer timeout
    await page.goto(url, { 
      waitUntil: "networkidle2", 
      timeout: 60000 
    });
    
    // Wait for page to load
    await sleep(5000);
    
    // Hide overlays
    await hideOverlays(page);
    
    // Find canvas/video element
    const clip = await findCanvas(page, url);
    if (!clip) {
      console.log("❌ Skipping URL - no suitable element found");
      await page.close();
      return { success: false, error: "No canvas/video element found" };
    }
    
    // Ensure even dimensions for video encoding
    const clipW = even(clip.width);
    const clipH = even(clip.height);
    
    console.log(`🎬 Capture area: ${clipW}x${clipH} at (${clip.x},${clip.y})`);
    console.log(`🔧 Type: ${clip.type}`);
    
    // Start rotation
    await startRotation(page, clip);
    
    // Verify content is advancing
    let isAdvancing = false;
    for (let tries = 0; tries < 10; tries++) {
      isAdvancing = await isContentAdvancing(page, clip);
      if (isAdvancing) break;
      await sleep(500);
    }
    
    if (!isAdvancing) {
      console.log("⚠️  Content appears static - attempting to force rotation");
    }
    
    // Start FFmpeg
    const ff = startFfmpeg(outputFile, FPS, clipW, clipH);
    const writeBuf = (buf) => new Promise((resolve, reject) => {
      const ok = ff.stdin.write(buf, (err) => (err ? reject(err) : resolve()));
      if (!ok) ff.stdin.once("drain", resolve);
    });
    
    // Capture frames
    const totalFrames = Math.max(1, Math.round(DURATION_S * FPS));
    console.log(`🎥 Capturing ${totalFrames} frames @ ${FPS} fps`);
    
    for (let i = 0; i < totalFrames; i++) {
      const buf = await page.screenshot({
        type: "png",
        clip: { x: clip.x, y: clip.y, width: clipW, height: clipH },
        captureBeyondViewport: false,
        omitBackground: false,
        encoding: "binary",
      });
      
      await writeBuf(buf);
      await sleep(1000 / FPS);
      
      // Progress indicator
      if ((i + 1) % 30 === 0 || i + 1 === totalFrames) {
        process.stdout.write(`📊 Frames: ${i + 1}/${totalFrames}\r`);
      }
    }
    
    process.stdout.write("\n");
    
    // Cleanup
    await stopRotation(page);
    ff.stdin.end();
    
    // Wait for FFmpeg to finish
    await new Promise((resolve, reject) => {
      ff.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
    
    console.log(`✅ Success: ${outputFile}`);
    await page.close();
    return { success: true, file: outputFile };
    
  } catch (error) {
    console.error(`❌ Error processing ${url}:`, error.message);
    await page.close();
    return { success: false, error: error.message };
  }
}

// Main function
(async () => {
  console.log("🚀 Starting VV360 Capture Script");
  console.log("=================================");
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`⏱️  Duration: ${DURATION_S} seconds`);
  console.log(`🎞️  FPS: ${FPS}`);
  console.log(`🔧 Debug mode: ${DEBUG_MODE}`);
  console.log("=================================");
  
  const chromePath = findChrome();
  if (!chromePath) {
    console.error("❌ Chrome/Chromium not found. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH");
    process.exit(1);
  }
  
  console.log(`🌐 Using Chrome: ${chromePath}`);
  
  let browser;
  const results = [];
  
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1920,1080",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--mute-audio",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`,
      ],
    });
    
    // Process each URL
    for (let i = 0; i < URLS.length; i++) {
      const result = await processUrl(browser, URLS[i], i);
      results.push(result);
      
      // Brief pause between URLs
      if (i < URLS.length - 1) {
        await sleep(2000);
      }
    }
    
    // Summary
    console.log("\n📊 Processing Summary");
    console.log("====================");
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (successful > 0) {
      console.log("\n🎬 Generated files:");
      results.filter(r => r.success).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.file}`);
      });
    }
    
    if (failed > 0) {
      console.log("\n⚠️  Failed URLs:");
      results.filter(r => !r.success).forEach((result, i) => {
        console.log(`  ${i + 1}. Error: ${result.error}`);
      });
    }
    
  } catch (error) {
    console.error("💥 Fatal error:", error.message);
  } finally {
    if (browser) await browser.close();
    console.log("\n🎉 Script finished");
  }
})();