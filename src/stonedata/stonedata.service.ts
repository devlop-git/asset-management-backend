import { Stonedata } from './entities/stonedata.entity';
import { getIgiReport } from '../utils/igi';
import { Inject, Injectable } from '@nestjs/common';
import { getDiamondCodes } from 'src/utils/common';
import { downloadMedia, detectVideoType } from '../utils/mediaProcessor';
import { fileUploadToGCP } from '../utils/gcpFileUpload';
import * as fs from 'fs';
import * as path from 'path';
import { dfeStoneQuery, getStoneVendorQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { getStockStonedataJoinQuery } from '../utils/dbQuery';
import { StoneSearchDto } from './stonedata.controller';
import { Media } from './entities/media.entity';
import { processVideo } from 'src/scripts/loupevideo';
import { captureVV360Video } from 'src/scripts/v360pipe';



@Injectable()
export class StonedataService {

  constructor(
    @Inject('MsSqlDataSource') private readonly dataSource: DataSource,
    @Inject('DFRDataSource') private readonly dfrDataSource: DataSource,
    @Inject('PostgresDataSource') private readonly pgDataSource: DataSource,
  ) { }
  async getDFEStockData() {
    try {
      const result = await this.dataSource.query(dfeStoneQuery());
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async fetchAndSaveDFEStockData() {
    try {
      const result = await this.getDFEStockData();
      return await this.saveDiamondDataToPostgres(result);
    } catch (e) {
      console.log(e);
    }
  }

  async getDFRStoneData(labDiamondIds: any, naturalDiamondIds: any) {
    try {
      const [labData, naturalData] = await Promise.all([
        this.dfrDataSource.query(labStoneQuery(labDiamondIds)),
        this.dfrDataSource.query(naturalStoneQuery(naturalDiamondIds)),
      ]);

      // return flat array
      return [...labData, ...naturalData];
    }
    catch (e) {
      console.log(e);
    }
  }

  async getDFEVendorStoneData(diamond_codes: any) {
    try {
      const result = await this.dataSource.query(getStoneVendorQuery(diamond_codes));
      return result;
    } catch (e) {
      console.log(e);
    }
  }
  async formatStoneData() {
    const stoneData: any[] = await this.getDFEStockData();
    if (!stoneData.length) return [];

    const formatedData = getDiamondCodes(stoneData);

    const labDiamondIds = formatedData.lab.map((item: any) => item.diamondCode);
    const naturalDiamondIds = formatedData.natural.map((item: any) => item.diamondCode);

    // flat array from DB
    // const dfrData = await this.getDFRStoneData(labDiamondIds, naturalDiamondIds);
    const dfrData = await this.getDFEVendorStoneData([...labDiamondIds, ...naturalDiamondIds]);

    // lookup map by diamond_code
    const dfrMap = new Map(
      dfrData.map((row: any) => [
        row.cert,
        {
          image_url: row.imageURL || null,
          video_url: row.videoURL || null,
          cert_url: row.certificateURL || null,
          lab: row.lab || null
        },
      ]),
    );

    return stoneData.map((stone: any) => {
      const [labName, code] = stone.StockID.split(" ");
      const isLab = stone.StoneType.toLowerCase().includes("lab");
      const dfrInfo: any = dfrMap.get(code) || {};

      return {
        ...stone,
        diamondCode: code,
        lab: dfrInfo.lab || labName,
        image_url: dfrInfo.image_url || null,
        video_url: dfrInfo.video_url || null,   // ✅ fixed key
        cert_url: dfrInfo.cert_url || null,     // ✅ include cert url if needed
        stoneType: isLab ? "lab" : "natural",
      };
    });

  }

  async saveDiamondDataToPostgres(diamondDataArray: any[]) {
    const stockRepo = this.pgDataSource.getRepository(Stock);
    const stocks: Stock[] = diamondDataArray.map(item => {
      const stock = new Stock();
      stock.stock = item.StockID || 0;
      stock.orderid = item.OrderNo || 0;
      stock.status = item.Status || '';
      let cert = '';
      if (item.StockID) {
        const parts = item.StockID.split(' ');
        cert = parts.length > 1 ? parts[1] : item.StockID;
      }
      stock.certificate_no = cert;
      stock.order_received_date = item.OrderRecdDate ? new Date(item.OrderRecdDate) : null;
      stock.diamond_received_date = item.DiaRequestDate ? new Date(item.DiaRequestDate) : null;
      stock.purity_name = item.PurityNm || '';
      stock.avg_weight = item.AvgWt || 0;
      stock.pieces = item.Pcs || 0;
      stock.stone_type = Array.isArray(item.StoneType) ? item.StoneType[0] : (item.StoneType || '');
      stock.lab = item.LabNm || '';
      stock.supplier = item.SupplierName || '';
      stock.dfr_supplier = item.DFR_SupplierName || '';
      stock.dfr_vendor = item.DFR_Vendor || '';
      stock.dfr_cert = item.DFR_CertificateNo || '';
      stock.is_certified_stone = true;
      stock.is_active = true;
      stock.tag_no = item.TagNo || '';
      return stock;
    });
    await stockRepo.save(stocks);
    return stocks;
  }


  async createStonedataFromStock() {
    const stockRepo = this.pgDataSource.getRepository(Stock);
    const stonedataRepo = this.pgDataSource.getRepository(Stonedata);
    const allStocks = await stockRepo.find();

    for (const stock of allStocks) {
      const parts = (stock.stock || '').split(' ');
      console.log("stock:", stock);
      console.log(parts[1], process.env.IGI_SUBSCRIPTION_KEY);
      if (parts[0].toUpperCase() === 'IGI' && parts[1]) {
        try {
          const igiData = await getIgiReport(parts[1], process.env.IGI_SUBSCRIPTION_KEY);
          // Map igiData to stonedata entity fields
          const stonedata = stonedataRepo.create({
            certificate_no: String(igiData.certificate_no ?? ''),
            lab: String(igiData.lab ?? ''),
            shape: String(igiData.shape ?? ''),
            measurement: String(igiData.measurement ?? ''),
            color: String(igiData.color ?? ''),
            clarity: String(igiData.clarity ?? ''),
            cut: String(igiData.cut ?? ''),
            fluorescence: String(igiData.fluorescence ?? ''),
            polish: String(igiData.polish ?? ''),
            symmetry: String(igiData.symmetry ?? ''),
            girdle: String(igiData.girdle ?? ''),
            depth: typeof igiData.depth === 'number' ? igiData.depth : Number(igiData.depth) || 0,
            table: String(igiData.table ?? ''),
            is_active: true,
            tag_no: String(stock.tag_no ?? ''),
            stone_type: Array.isArray(stock.stone_type) ? stock.stone_type.join(', ') : String(stock.stone_type ?? ''),
            carat: typeof igiData.carat === 'number' ? igiData.carat : Number(igiData.carat) || 0,
            intensity: String(igiData.intensity ?? ''),
            // add other fields as needed
          });
          await stonedataRepo.save(stonedata);
        } catch (e) {
          console.error(`Failed for cert ${parts[1]}:`, e);
        }
      }
    }
  }

  async insertMediaData() {
    const stoneRepo = this.pgDataSource.getRepository(Stonedata);
    const mediaRepo = this.pgDataSource.getRepository(Media);

    // Fetch stones from DB
    const stoneData = await stoneRepo.find();

    // Get vendor data
    const diamondIds = stoneData.map(item => item.certificate_no);
    const dfrData = await this.getDFEVendorStoneData(diamondIds);
    const dfrMap = new Map(dfrData.map((item: any) => [item.cert, item])); // cert → dfr record

    // Build insert objects
    const medias = stoneData.map(stone => {
      const dfr: any = dfrMap.get(stone.certificate_no);

      const media = new Media();
      media.stonedata = { id: stone.id } as any;  // ✅ link via object
      media.image_url = dfr?.imageURL || null;
      media.is_image_original = dfr ? true : false;
      media.video_url = dfr?.videoURL || null;
      media.is_video_original = dfr ? true : false;
      media.cert_url = dfr?.certificateURL || null;
      media.is_certified_stone = dfr ? true : false;
      media.is_manual_upload = false;
      return media;
    });

    await mediaRepo.save(medias);

    return medias;
  }



  async getPaginatedIgiList(page: number = 1, pageSize: number = 20) {
    const offset = (page - 1) * pageSize;
    const countQuery = `SELECT COUNT(*) FROM stock s WHERE s.is_active = true AND s.stock LIKE 'IGI %'`;
    const totalResult = await this.pgDataSource.query(countQuery);
    const total = parseInt(totalResult[0].count, 10);

    const dataQuery = `${getStockStonedataJoinQuery()} LIMIT ${pageSize} OFFSET ${offset}`;
    const data = await this.pgDataSource.query(dataQuery);

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  async getStonedataByCertificateNo(certificateNo: string) {
    const query = `
     SELECT
      s.id AS stock_id,
      sd.id AS stone_id,
      m.id AS media_id,
      s.*, sd.*, m.*
    FROM stock s
    LEFT JOIN stonedata sd ON s.certificate_no = sd.certificate_no
    LEFT JOIN media m ON sd.id = m.stone_id
    WHERE s.certificate_no ILIKE $1
    LIMIT 1
    `;
    const result = await this.pgDataSource.query(query, [`%${certificateNo}%`]);
    return result[0] || null;
  }

  async searchStonedata(filters: StoneSearchDto, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const where: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Helper to ensure array for multi-value filters
    const toArray = (val) => {
      if (val == null) return undefined;
      return Array.isArray(val) ? val : [val];
    };

    // Strictly use only DTO fields
    if (filters.tag_no) {
      where.push(`s.tag_no ILIKE $${paramIndex}`);
      params.push(`%${filters.tag_no}%`);
      paramIndex++;
    }
    const certTypeArr = toArray(filters.certificate_type);
    if (certTypeArr && certTypeArr.length) {
      where.push(`s.lab = ANY($${paramIndex})`);
      params.push(certTypeArr);
      paramIndex++;
    }
    const certNoArr = toArray(filters.certificate_no);
    if (certNoArr && certNoArr.length) {
      // Use ILIKE for partial/regex search
      const certNoConditions = certNoArr.map((val, idx) => {
        params.push(`%${val}%`);
        return `s.certificate_no ILIKE $${paramIndex + idx}`;
      });
      where.push(`(${certNoConditions.join(' OR ')})`);
      paramIndex += certNoArr.length;
    }
    const stoneTypeArr = toArray(filters.stone_type);
    if (stoneTypeArr && stoneTypeArr.length) {
      where.push(`s.stone_type = ANY($${paramIndex})`);
      params.push(stoneTypeArr);
      paramIndex++;
    }
    const shapeArr = toArray(filters.shape);
    if (shapeArr && shapeArr.length) {
      where.push(`sd.shape = ANY($${paramIndex})`);
      params.push(shapeArr);
      paramIndex++;
    }
    if (filters.carat_from != null && filters.carat_to != null) {
      where.push(`s.avg_weight BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filters.carat_from, filters.carat_to);
      paramIndex += 2;
    }
    const colorArr = toArray(filters.color);
    if (colorArr && colorArr.length) {
      where.push(`sd.color = ANY($${paramIndex})`);
      params.push(colorArr);
      paramIndex++;
    }
    const clarityArr = toArray(filters.clarity);
    if (clarityArr && clarityArr.length) {
      where.push(`sd.clarity = ANY($${paramIndex})`);
      params.push(clarityArr);
      paramIndex++;
    }
    const cutArr = toArray(filters.cut);
    if (cutArr && cutArr.length) {
      where.push(`sd.cut = ANY($${paramIndex})`);
      params.push(cutArr);
      paramIndex++;
    }
    const polishArr = toArray(filters.polish);
    if (polishArr && polishArr.length) {
      where.push(`sd.polish = ANY($${paramIndex})`);
      params.push(polishArr);
      paramIndex++;
    }
    const symmetryArr = toArray(filters.symmetry);
    if (symmetryArr && symmetryArr.length) {
      where.push(`sd.symmetry = ANY($${paramIndex})`);
      params.push(symmetryArr);
      paramIndex++;
    }
    const fluorescenceArr = toArray(filters.fluorescence);
    if (fluorescenceArr && fluorescenceArr.length) {
      where.push(`sd.fluorescence = ANY($${paramIndex})`);
      params.push(fluorescenceArr);
      paramIndex++;
    }
    const intensityArr = toArray(filters.intensity);
    if (intensityArr && intensityArr.length) {
      where.push(`sd.intensity = ANY($${paramIndex})`);
      params.push(intensityArr);
      paramIndex++;
    }

    let whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const baseQuery = `
      SELECT
        sd.tag_no,
        s.lab AS "CertificateType",
        s.certificate_no AS "CertificateNo",
        s.stone_type AS "StoneType",
        sd.shape AS "Shape",
        sd.carat AS "Carat",
        sd.color AS "Color",
        sd.clarity AS "Clarity",
        sd.cut AS "Cut",
        sd.polish AS "Polish",
        sd.symmetry AS "Symmetry",
        sd.fluorescence AS "Fluorescence",
        sd.intensity AS "Intensity"
      FROM stock s
      LEFT JOIN stonedata sd
        ON s.certificate_no = sd.certificate_no
      ${whereClause}
    `;

    // Error handling
    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM stock s LEFT JOIN stonedata sd ON s.certificate_no = sd.certificate_no ${whereClause}`;
      const totalResult = await this.pgDataSource.query(countQuery, params);
      const total = parseInt(totalResult[0].count, 10);

      // Get paginated data
      const dataQuery = `${baseQuery} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const dataParams = [...params, pageSize, offset];
      const data = await this.pgDataSource.query(dataQuery, dataParams);

      return {
        success: true,
        data,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || error,
        data: [],
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      };
    }
  }
  async automateMediaProcessingAndUpload() {
    const mediaRepo = this.pgDataSource.getRepository(Media);
    const stonedataRepo = this.pgDataSource.getRepository(Stonedata);
    // Ensure tmp directory exists
    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Fetch stones from DB
    const stoneData = await stonedataRepo.find();

    // Get vendor data
    const diamondIds = stoneData.map(item => item.certificate_no);
    const dfrData = await this.getDFEVendorStoneData(diamondIds);
    // const dfrMap = new Map(dfrData.map((item: any) => [item.cert, item])); // cert → dfr record

    // const stones = await this.formatStoneData();
    // console.log("stones",stones.length);
    for (const stone of dfrData) {
      const { imageURl, videoURL, cert } = stone;
      //   // Skip stones with missing certificate_no
      //   if (!certificate_no) {
      //     console.warn('Skipping stone with missing certificate_no:', stone);
      //     continue;
      //   }
      //   // Only process if there is a video_url or image_url
      //   if (!video_url && !image_url) continue;

      let gcpVideoUrl = null;
      // if (videoURL) {
      //   const videoType = detectVideoType(videoURL);
      //   const localVideoPath = path.join(__dirname, `../../tmp/${cert}_video.mp4`);
      //   let processedVideoPath = localVideoPath;
      //   try {
      //     await downloadMedia(videoURL, localVideoPath);
      //     // Use correct output filename for processed video
      //     if (videoType === 'loupe') {
      //       processedVideoPath = localVideoPath.endsWith('.mp4')
      //         ? localVideoPath.replace(/\.mp4$/, '_loupe.mp4')
      //         : localVideoPath + '_loupe.mp4';
      //     } else if (videoType === 'vv360') {
      //       processedVideoPath = localVideoPath.endsWith('.mp4')
      //         ? localVideoPath.replace(/\.mp4$/, '_vv360.mp4')
      //         : localVideoPath + '_vv360.mp4';
      //     }
      //     console.log("videoType....",videoType);
      //     if (videoType === 'loupe' || videoType === 'vv360') {
      //         const result = await processVideo(localVideoPath, videoType);
      //         console.log('processVideo result:', result);
      //     }
      //     // console.log("localVideoPath....",localVideoPath);
      //     // console.log("processedVideoPath....",processedVideoPath);
      //     // Only upload if processed file exists
      //     // if (fs.existsSync(processedVideoPath)) {
      //     //   const videoBuffer = fs.readFileSync(processedVideoPath);
      //     //   gcpVideoUrl = await fileUploadToGCP('videos', path.basename(processedVideoPath), { buffer: videoBuffer });
      //     //     console.log('GCP video URL:', gcpVideoUrl);
      //     // } else {
      //     //   console.error(`Processed video not found: ${processedVideoPath}`);
      //     // }
      //   } catch (err) {
      //     console.error(`Video processing failed for ${cert}:`, err);
      //   }
      // }

      // let gcpImageUrl = null;
      // if (image_url) {
      //   const localImagePath = path.join(__dirname, `../../tmp/${diamondCode}_image.jpg`);
      //   try {
      //     await downloadMedia(image_url, localImagePath);
      //     if (fs.existsSync(localImagePath)) {
      //       const imageBuffer = fs.readFileSync(localImagePath);
      //       gcpImageUrl = await fileUploadToGCP('images', `${diamondCode}_image.jpg`, { buffer: imageBuffer });
      //     } else {
      //       console.error(`Downloaded image not found: ${localImagePath}`);
      //     }
      //   } catch (err) {
      //     console.error(`Image download/upload failed for ${diamondCode}:`, err);
      //   }
      // }

      // // Find stone_id for certificate_no
      // const stoneEntity = await stonedataRepo.findOne({ where: { certificate_no: String(certificate_no) } });
      // if (!stoneEntity) continue;
      // console.log({
      //   stonedata: stoneEntity,
      //   video_url: gcpVideoUrl,
      //   image_url: gcpImageUrl,
      //   is_video_original: !!gcpVideoUrl,
      //   is_image_original: !!gcpImageUrl,
      //   is_certified_stone: true,
      // })
      // Save to media table
      // const media = mediaRepo.create({
      //   stonedata: stoneEntity,
      //   video_url: gcpVideoUrl,
      //   image_url: gcpImageUrl,
      //   is_video_original: !!gcpVideoUrl,
      //   is_image_original: !!gcpImageUrl,
      //   is_certified_stone: true,
      // });
      // await mediaRepo.save(media);
    }
    return { success: true };
  }

  


}
