import * as pdfParse from 'pdf-parse';
import fetch from 'node-fetch';

export async function getIgiCertUrl(certNumber: string | number, key: string = process.env.IGI_SUBSCRIPTION_KEY || ''): Promise<string> {
//   if (!/^\d{6,}$/.test(String(certNumber))) throw new Error('Invalid certificate number');
  if (!key) throw new Error('Missing IGI subscription key');

  const base = 'https://tools.igi.org/pdf/loadPDF';
  const params = new URLSearchParams({ r: String(certNumber), url: 'null' });

  let res = await fetch(`${base}?${params}`, {
    method: 'GET',
    headers: { 'Accept': '*/*', 'Ocp-Apim-Subscription-Key': key },
  });

  if (res.status === 401) {
    params.set('subscription-key', key);
    res = await fetch(`${base}?${params}`, { headers: { 'Accept': '*/*' } });
  }

  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);

  try { const j = JSON.parse(text); if (j && typeof j.url === 'string') return j.url; } catch {}
  const url = text.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error(`Unexpected IGI response: ${text.slice(0,200)}`);
  return url;
}

export async function extractTextFromPdfUrl(pdfUrl: string): Promise<string> {
  const res = await fetch(pdfUrl);
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`PDF download failed (${res.status} ${res.statusText})${t ? `: ${t}` : ''}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const data = await pdfParse(buf);
  return (data.text || '').replace(/\u0000/g, '').trim();
}

function getEither(text: string, ...res: RegExp[]): string | null {
  for (const re of res) {
    const m = text.match(re);
    if (m) return (m[1] || m[2]).trim();
  }
  return null;
}

export interface DiamondReport {
  lab: string;
  certificate_no: string | null;
  shape: string | null;
  measurement: string | null;
  caratWeight: number | null;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  fluorescence: string | null;
  polish: string | null;
  symmetry: string | null;
  girdle: string | null;
  culet: string | null;
  depth: number | null;
  table: number | null;
  note?: string;
}

export function parseDiamondReport(text: string): DiamondReport {
  const get = (re: RegExp) => {
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  const getNum = (...res: RegExp[]) => {
    const v = getEither(text, ...res);
    return v != null ? parseFloat(v) : null;
  };
  return {
    lab: 'IGI',
    certificate_no:
      get(/(?:Report\s*(?:No\.?|Number)|IGI\s*No\.?)\s*[:\-]?\s*([A-Z0-9\-]+)/i),
    shape:
      get(/Shape(?:\s*and\s*Cutting\s*Style)?\s*[:\-]?\s*([A-Za-z \-]+)(?:\n|$)/i),
    measurement:
      get(/Measurements?\s*[:\-]?\s*([\d.\s\-–xX]+mm)/i),
    caratWeight:
      getNum(/(?:Carat\s*Weight|Weight)\s*[:\-]?\s*([\d.]+)\s*(?:ct|carat)/i),
    color:
      get(/Color(?:\s*Grade)?\s*[:\-]?\s*([A-Za-z0-9 \-]+)(?:\n|$)/i),
    clarity:
      get(/Clarity(?:\s*Grade)?\s*[:\-]?\s*([A-Z]{1,3}\d?)/i),
    cut:
      get(/Cut\s*Grade\s*[:\-]?\s*([A-Za-z ]+)(?:\n|$)/i),
    fluorescence:
      get(/Fluorescence\s*[:\-]?\s*([A-Za-z ]+)(?:\n|$)/i),
    polish:
      get(/Polish\s*[:\-]?\s*([A-Za-z ]+)(?:\n|$)/i),
    symmetry:
      get(/Symmetry\s*[:\-]?\s*([A-Za-z ]+)(?:\n|$)/i),
    girdle: get(/Girdle\s*[:\-]?\s*([A-Za-z0-9 \-–]+)(?:\n|$)/i),
    culet: capFirst(getEither(text,
      /Culet\s*[:\-]?\s*([A-Za-z \-]+)/i, 
      /([A-Za-z \-]+)\s*Culet/i)),       
    depth: getNum(
      /Depth\s*[:\-]?\s*([\d.]+)\s*%/i,   
      /([\d.]+)\s*%\s*Depth/i            
    ),
    table: getNum(
      /Table\s*[:\-]?\s*([\d.]+)\s*%/i,  
      /([\d.]+)\s*%\s*Table/i            
    ),
  };
}

function capFirst(s: string | null): string | null {
  if (s == null) return s;
  return String(s)
    .toLowerCase()
    .replace(/\b[a-z]/g, ch => ch.toUpperCase());
}

export function normalizeFieldsSimple(fields: DiamondReport): DiamondReport {
  const keys = ['polish', 'symmetry', 'fluorescence', 'girdle', 'culet', 'shape', 'cut'] as const;
  for (const k of keys) if (fields[k]) fields[k] = capFirst(fields[k]) as any;
  return fields;
}

export async function getIgiReport(certNumber: string | number, key?: string): Promise<{ cert_url: string } & DiamondReport> {
  const cert_url = await getIgiCertUrl(certNumber, key || process.env.IGI_SUBSCRIPTION_KEY || '');
  const text = await extractTextFromPdfUrl(cert_url);
  const fields = normalizeFieldsSimple(parseDiamondReport(text));

  if (!Object.values(fields).some(Boolean) || text.length < 300) {
    fields.note = 'Low extracted text — PDF might be scanned (OCR may be required).';
  }

  return { cert_url, ...fields };
}
