import { capitalizeWords } from "src/utils/common";

interface RawReport {
  'REPORT NUMBER': string;
  'REPORT DATE': string;
  DESCRIPTION: string;
  'SHAPE AND CUT': string;
  'CARAT WEIGHT': string;
  'COLOR GRADE': string;
  'CLARITY GRADE': string;
  'CUT GRADE': string;
  POLISH: string;
  SYMMETRY: string;
  Measurements: string;
  'Table Size': string;
  'Crown Height': string;
  'Pavilion Depth': string;
  'Girdle Thickness': string;
  Culet: string;
  'Total Depth': string;
  FLUORESCENCE: string;
  COMMENTS: string;
  'Inscription(s)': string;
  REPORT1_PDF: string;
  // other fields if needed
}

function parseCaratWeight(value: string): number {
  const match = value.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

function parsePercentage(value: string): number {
  const match = value.match(/([\d.]+)%/);
  return match ? parseFloat(match[1]) : 0;
}

export const   getIgiInfo=async(
  certNumber: string | number,
  key: string = process.env.IGI_SUBSCRIPTION_KEY || ''
): Promise<string | any> =>{
  if (!key) throw new Error('Missing IGI subscription key');

  const params = new URLSearchParams({ r: String(certNumber), url: 'null' });
  const apiUrl = process.env.IGI_API_URL || 'https://tools.igi.org/report/details';

  let res = await fetch(`${apiUrl}?${params}`, {
    method: 'GET',
    headers: { 'Accept': '*/*', 'Ocp-Apim-Subscription-Key': key },
  });

  if (res.status === 401) {
    params.set('subscription-key', key);
    res = await fetch(`${apiUrl}?${params}`, { headers: { 'Accept': '*/*' } });
  }

    try {
      const json = await res.json();
      return json;
    } catch (err) {
      throw new Error(`Failed to parse JSON: ${err}`);
    }
  
}

export const mapReportToStoneAndMedia = (report: RawReport, stock: any) => {
  const stonedata = {
    certificate_no: report['REPORT NUMBER'] || '',
    lab: 'IGI',
    shape: capitalizeWords(report['SHAPE AND CUT'] || ''),
    measurement: report.Measurements || '',
    caratWeight: parseCaratWeight(report['CARAT WEIGHT'] || ''),
    carat: parseCaratWeight(report['CARAT WEIGHT'] || ''),
    color: capitalizeWords(report['COLOR GRADE'] || ''),
    clarity: report['CLARITY GRADE'] || '',
    cut: capitalizeWords(report['CUT GRADE'] || ''),
    polish: capitalizeWords(report.POLISH || ''),
    symmetry: capitalizeWords(report.SYMMETRY || ''),
    girdle: capitalizeWords(report['Girdle Thickness'] || ''),
    culet: capitalizeWords(report.Culet || ''),
    depth: parsePercentage(report['Total Depth'] || ''),
    table: parsePercentage(report['Table Size'] || ''),
    fluorescence: capitalizeWords(report.FLUORESCENCE || ''),
    intensity: '', // Not in report; fallback empty
    measurement_mm: report.Measurements || '',
    is_active:true,
    note: report.COMMENTS || '',
    tag_no: stock.tag_no ?? '',
    stone_type: stock.stone_type,
  };

  const media = {
    cert_url: `${process.env.IGI_PDF_URL}/${report.REPORT1_PDF}`,
    is_certified_stone: true,
    is_active:true
    // stone_id will be assigned after saving stonedata
  };

  return { stonedata, media };
};

