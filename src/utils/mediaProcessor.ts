import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { processVideo } from 'src/scripts/loupevideo';
import { fileUploadToGCP } from './gcpFileUpload';
import { captureVV360Video } from 'src/scripts/v360pipe';


export async function downloadMedia(url: string, dest: string): Promise<string> {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(dest));
    writer.on('error', reject);
  });
}

export function detectVideoType(url: string): 'loupe' | 'vv360' | 'other' {
  if (url.includes('loupe')) return 'loupe';
  if (url.includes('vv360')) return 'vv360';
  return 'other';
}

export const  handleImage =async(cert, image_url)=> {
    let gcpImageUrl ;
      if (image_url) {
        const localImagePath = path.join(__dirname, `../../tmp/${cert}_image.jpg`);
        try {
          await downloadMedia(image_url, localImagePath);
          if (fs.existsSync(localImagePath)) {
            const imageBuffer = fs.readFileSync(localImagePath);
            gcpImageUrl = await fileUploadToGCP('images', `${cert}_image.jpg`, { buffer: imageBuffer });
          } else {
            console.error(`Downloaded image not found: ${localImagePath}`);
          }
        } catch (err) {
          console.error(`Image download/upload failed for ${cert}:`, err);
        }
      }
  }

  export const  handleVideo=async(cert, videoURL)=> {
    if (!videoURL) return null;

    const videoType = detectVideoType(videoURL);
    const localVideoPath = path.join(__dirname, `../../tmp/${cert}_video.mp4`);
    let processedVideoPath = localVideoPath;

    try {
      // Adjust processed filename based on video type
      if (videoType === "loupe") {
        processedVideoPath = localVideoPath.replace(/\.mp4$/, "_loupe.mp4");
      } else {
        processedVideoPath = localVideoPath.replace(/\.mp4$/, "_vv360.mp4");
      }

      console.log("videoType:", videoType);

      // Process only if loupe or vv360 type
      if (videoType === "loupe") {
        console.log("Processing video...", processedVideoPath);
        console.log("videoURL....", videoURL);
        await processVideo(videoURL, processedVideoPath, 30); // process with URL, output path, fps
        console.log("Processed video saved at:", processedVideoPath);
      } else {
        console.log("Processing video...", processedVideoPath);
        console.log("videoURL....", videoURL);
        await captureVV360Video(videoURL, {
          duration: 20,
          fps: 25,
          outputFile: processedVideoPath,
          debug: true
        }); // process with URL, output path, fps
        console.log("Processed video saved at:", processedVideoPath);
        return null;
      }

      // Upload to GCP if processed file exists
      if (fs.existsSync(processedVideoPath)) {
        const videoBuffer = fs.readFileSync(processedVideoPath);
        const gcpVideoUrl = await fileUploadToGCP(
          "videos",
          path.basename(processedVideoPath),
          { buffer: videoBuffer }
        );
        console.log("GCP video URL:", gcpVideoUrl);
        return gcpVideoUrl;
      } else {
        console.error(`Processed video not found: ${processedVideoPath}`);
        return null;
      }
    } catch (err) {
      console.error(`Video processing failed for ${cert}:`, err);
      return null;
    }
  }

// Placeholder for actual video processing logic
// export async function processVideo(filePath: string, type: 'loupe' | 'vv360'): Promise<string> {
//   // Run external processing scripts for loupe/vv360
//   const { exec } = require('child_process');
//   let processedPath = filePath;
//   try {
//     let outputPath = filePath;
//     if (type === 'loupe') {
//       // Always add _loupe.mp4 extension
//       outputPath = filePath.endsWith('.mp4') ? filePath.replace(/\.mp4$/, '_loupe.mp4') : filePath + '_loupe.mp4';
//       console.log("outputPath....",outputPath);
//       console.log("filePath....",filePath);
//       await new Promise((resolve, reject) => {
//         exec(`node src/scripts/loupevideo.js "${filePath}" "${outputPath}"`, (error, stdout, stderr) => {
//           if (error) return reject(error);
//           resolve(stdout);
//         });
//       });
//       processedPath = outputPath;
//     } else if (type === 'vv360') {
//       // Always add _vv360.mp4 extension
//       outputPath = filePath.endsWith('.mp4') ? filePath.replace(/\.mp4$/, '_vv360.mp4') : filePath + '_vv360.mp4';
//       await new Promise((resolve, reject) => {
//         exec(`node src/scripts/vv360_pipe_clean3.cjs "${filePath}" "${outputPath}"`, (error, stdout, stderr) => {
//           if (error) return reject(error);
//           resolve(stdout);
//         });
//       });
//       console.log("outputPath....",outputPath);
//       processedPath = outputPath;
//     }
//     // For other types, just return the original filePath
//     return processedPath;
//   } catch (err) {
//     console.error('Video processing failed:', err);
//     return filePath;
//   }
// }

