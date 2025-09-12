import * as fs from 'fs';
import * as path from 'path';

export const getDiamondCodes = (stoneData: any) => {
    const result = { lab: [], natural: [] };

    stoneData.forEach(item => {
        const parts = item.StockID.split(" "); // ["IGI", "LG717596099"]
        const lab = parts[0];
        const diamondCode = parts[1] || null;

        const formatted = {
            diamondCode,
            lab,
            image_url: null,
            videourl: null,
            stoneType: item.StoneType.toLowerCase().includes("lab")
                ? "lab"
                : "natural"
        };

        if (formatted.stoneType === "lab") {
            result.lab.push(formatted);
        } else {
            result.natural.push(formatted);
        }
    });

    return result;

};

export const  capitalizeWords= (str: string): string =>{
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to log failed certificate numbers
export const logFailedCert = async (certNumber: string | number, error: any) => {
  try {
    const logFilePath = path.join(__dirname, '../../failed_certificates.log');
    console.log("logFilePath....", logFilePath);
    const logMessage = `${new Date().toISOString()} - Cert: ${certNumber} - Error: ${error}\n`;
      fs.appendFileSync(logFilePath, logMessage);
  } catch (fileError) {
    console.error('Failed to write to log file:', fileError);
  }
};