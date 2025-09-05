import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

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

// Placeholder for actual video processing logic
export async function processVideo(filePath: string, type: 'loupe' | 'vv360'): Promise<string> {
  // Run external processing scripts for loupe/vv360
  const { exec } = require('child_process');
  let processedPath = filePath;
  try {
    let outputPath = filePath;
    if (type === 'loupe') {
      // Always add _loupe.mp4 extension
      outputPath = filePath.endsWith('.mp4') ? filePath.replace(/\.mp4$/, '_loupe.mp4') : filePath + '_loupe.mp4';
      console.log("outputPath....",outputPath);
      await new Promise((resolve, reject) => {
        exec(`node src/scripts/loupevideo.js "${filePath}" "${outputPath}"`, (error, stdout, stderr) => {
          if (error) return reject(error);
          resolve(stdout);
        });
      });
      processedPath = outputPath;
    } else if (type === 'vv360') {
      // Always add _vv360.mp4 extension
      outputPath = filePath.endsWith('.mp4') ? filePath.replace(/\.mp4$/, '_vv360.mp4') : filePath + '_vv360.mp4';
      await new Promise((resolve, reject) => {
        exec(`node src/scripts/vv360_pipe_clean3.cjs "${filePath}" "${outputPath}"`, (error, stdout, stderr) => {
          if (error) return reject(error);
          resolve(stdout);
        });
      });
      processedPath = outputPath;
    }
    // For other types, just return the original filePath
    return processedPath;
  } catch (err) {
    console.error('Video processing failed:', err);
    return filePath;
  }
}

