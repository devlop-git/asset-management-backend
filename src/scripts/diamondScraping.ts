import { logFailedCert } from "src/utils/common";

const axios = require('axios');
const pLimit = require('p-limit');
const path = require('path');
const fs = require('fs');
const axiosRetry = require('axios-retry').default;

const http = require('http');
const https = require('https');

// Enable retries for network errors and server errors
axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 1000,
    retryCondition: (error) => {
        return error.code === 'ECONNABORTED' || !error.response || error.response.status >= 500;
    }
});

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const certificateNumbers = [
    'LG707553011', 'LG722566491', 'LG729521582', 'LG698504829',
    'LG729566893', 'LG689577776', 'LG729521732', 'LG723518727'
    // Add more as needed
];

export const  getRandomTimeout=() =>{
    return Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
}

export const  delay=(ms)=> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// const logFailedCert = (certNumber, error) => {
//     try {
//         const logFilePath = path.join(__dirname, 'failed_certificates.log');
//         const logMessage = `${new Date().toISOString()} - Cert: ${certNumber} - Error: ${error}\n`;
//         fs.appendFileSync(logFilePath, logMessage);
//     } catch (fileError) {
//         console.error('Failed to write to log file:', fileError);
//     }
// };

async function fetchDetails(certNumber) {
    try {
        console.log('Fetching details for:', certNumber);
        const response = await axios({
            method: 'GET',
            url: 'https://tools.igi.org/report/details',
            params: { r: certNumber },
            timeout: 20000,
            responseType: 'text', // Always text; we'll parse later
            httpAgent,
            httpsAgent,
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Content-type': 'text/plain',
                'Ocp-Apim-Subscription-Key': '359cede0ba2c481ab32890967c95847a',
                'Origin': 'https://www.igi.org',
                'Referer': 'https://www.igi.org/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            }
        });

        console.log('Response status:', response.status);

        // Check if response is JSON; if not, consider it a failure
        try {
            JSON.parse(response.data);
        } catch (e) {
            throw new Error('Invalid JSON response');
        }

        console.log('✅ Valid JSON response for', certNumber);
        return response.data;

    } catch (error) {
        console.error('Request failed for:', certNumber);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error message:', error.message);
        }
        throw error;
    }
}

// export const  processAll=async(certNumber) =>{
//     // for (const certNumber of certNumbers) {
//         let attempt = 0;
//         let success = false;
//         while (attempt < 3 && !success) {
//             try {
//                 console.log(`Processing ${certNumber}, attempt ${attempt + 1}...`);
//                 const data = await fetchDetails(certNumber);
//                 console.log(`✅ Done ${certNumber}`);
//                 success = true;
//                 return data;
//             } catch (error) {
//                 attempt++;
//                 if (attempt >= 3) {
//                     console.error(`❌ All attempts failed for ${certNumber}`);
//                     logFailedCert(certNumber, error.message);
//                     return null
//                 } else {
//                     console.warn(`⚠️ Retry ${attempt} for ${certNumber}`);
//                     await delay(getRandomTimeout());
//                 }
//             }
//         }
//     // }
// }

// Start processing
// processAll(certificateNumbers);



export const processAll = async (certNumber: string) => {
    let attempt = 0;
    let success = false;

    while (attempt < 3 && !success) {
        try {
            console.log(`Processing ${certNumber}, attempt ${attempt + 1}...`);
            const data = await fetchDetails(certNumber);
            console.log(`✅ Done ${certNumber}`);
            success = true;
            return data;
        } catch (error) {
            attempt++;
            console.warn(`⚠️ Attempt ${attempt} failed for ${certNumber}: ${error.message || error}`);
            if (attempt >= 3) {
                console.error(`❌ All attempts failed for ${certNumber}`);
                logFailedCert(certNumber, error.message || 'Unknown error');
                return null;
            }
            await delay(getRandomTimeout());
        }
    }
};
