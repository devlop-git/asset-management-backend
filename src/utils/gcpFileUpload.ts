import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import * as path from 'path';

config();

const configService = new ConfigService();
const keyFilename = path.join(__dirname, '/../../src/data/nj_gcp_creds.json');
console.log(keyFilename);
export const storage = new Storage({
  projectId: configService.get('GCP_PROJECT_ID'),
  keyFilename,
});

export async function fileUploadToGCP(
  destinationPath: string, // where to store it in GCP
  filename:string,
  media:any
): Promise<string | null> {
  try {
    const bucketName = configService.get('GCP_PUBLIC_BUCKET');
    console.log("file",filename)
    console.log("destination....",destinationPath)
    const file = storage.bucket(bucketName).file(destinationPath+'/'+filename);
    // console.log(file,'file')
    await file.save(media.buffer, {
      gzip: true,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    console.log("file....",`${configService.get('GCP_STORAGE_PATH')}/${bucketName}/${destinationPath}/${filename}`);
    return `${configService.get('GCP_STORAGE_PATH')}/${bucketName}/${destinationPath}/${filename}`;
    // public URL of uploaded file
  } catch (err) {
    console.error('Error uploading to GCS:', err);
    return null;
  }
}
