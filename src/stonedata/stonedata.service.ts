import { Stonedata } from './entities/stonedata.entity';
import { Inject, Injectable } from '@nestjs/common';
import { getDiamondCodes } from 'src/utils/common';
import { downloadMedia, detectVideoType, handleVideo, handleImage } from '../utils/mediaProcessor';
import { fileUploadToGCP } from '../utils/gcpFileUpload';
import * as fs from 'fs';
import * as path from 'path';
import { dfeStoneQuery, getStoneVendorQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource, Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { getStockStonedataJoinQuery } from '../utils/dbQuery';
import { StoneSearchDto } from './stonedata.controller';
import { Media } from './entities/media.entity';
import { processVideo } from 'src/scripts/loupevideo';
import { captureVV360Video } from 'src/scripts/v360pipe';
import { getIgiInfo, mapReportToStoneAndMedia } from 'src/scripts/scrapepdf';



@Injectable()
export class StonedataService {
  private stoneRepo: Repository<Stonedata>;
  private mediaRepo: Repository<Media>;

  constructor(
    @Inject('MsSqlDataSource') private readonly dataSource: DataSource,
    @Inject('DFRDataSource') private readonly dfrDataSource: DataSource,
    @Inject('PostgresDataSource') private readonly pgDataSource: DataSource,
  ) {
    this.stoneRepo = this.pgDataSource.getRepository(Stonedata);
    this.mediaRepo = this.pgDataSource.getRepository(Media);
  }
  async getDFEStockData(page?:any,limit?:any) {
    try {
      const result = await this.dataSource.query(dfeStoneQuery(page,limit));
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async fetchAndSaveDFEStockData(page,limit) {
    try {
      const result = await this.getDFEStockData(page,limit);
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
  // async formatStoneData() {
  //   const stoneData: any[] = await this.getDFEStockData();
  //   if (!stoneData.length) return [];

  //   const formatedData = getDiamondCodes(stoneData);

  //   const labDiamondIds = formatedData.lab.map((item: any) => item.diamondCode);
  //   const naturalDiamondIds = formatedData.natural.map((item: any) => item.diamondCode);

  //   // flat array from DB
  //   // const dfrData = await this.getDFRStoneData(labDiamondIds, naturalDiamondIds);
  //   const dfrData = await this.getDFEVendorStoneData([...labDiamondIds, ...naturalDiamondIds]);

  //   // lookup map by diamond_code
  //   const dfrMap = new Map(
  //     dfrData.map((row: any) => [
  //       row.cert,
  //       {
  //         image_url: row.imageURL || null,
  //         video_url: row.videoURL || null,
  //         cert_url: row.certificateURL || null,
  //         lab: row.lab || null
  //       },
  //     ]),
  //   );

  //   return stoneData.map((stone: any) => {
  //     const [labName, code] = stone.StockID.split(" ");
  //     const isLab = stone.StoneType.toLowerCase().includes("lab");
  //     const dfrInfo: any = dfrMap.get(code) || {};

  //     return {
  //       ...stone,
  //       diamondCode: code,
  //       lab: dfrInfo.lab || labName,
  //       image_url: dfrInfo.image_url || null,
  //       video_url: dfrInfo.video_url || null,   // ✅ fixed key
  //       cert_url: dfrInfo.cert_url || null,     // ✅ include cert url if needed
  //       stoneType: isLab ? "lab" : "natural",
  //     };
  //   });

  // }

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
      stock.dfr_shape = item.ShapeNm?.trim() || '';
      stock.dfr_color = item.DFR_Color?.trim() || '';
      stock.dfr_clarity = item.DFR_Clarity?.trim() || '';
      stock.dfr_cut = item.DFR_Cut?.trim() || '';
      stock.dfr_polish = item.DFR_Polish?.trim() || '';
      stock.dfr_symmetry = item.DFR_symmetry?.trim() || '';
      stock.dfr_fluorescence = item.FluorescenceIntensity?.trim() || '';
      stock.dfr_measurement = item.MM || '';
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
    const allStocks = await stockRepo.find();

    allStocks.forEach(async (stock: any) => {
      const parts = (stock.stock || '').split(' ');
      const cert = parts[1];
      const lab = parts[0];
      console.log("stock:", stock);
      console.log(parts[1], process.env.IGI_SUBSCRIPTION_KEY);
      if (lab === 'IGI' && cert) {
        try {
          const report = await getIgiInfo(cert)
          const { stonedata, media }: any = mapReportToStoneAndMedia(report[0], stock);

          // Create and save stonedata
          const stoneEntity = this.stoneRepo.create(stonedata);
          const savedStone: any = await this.stoneRepo.save(stoneEntity);

          const mediaEntity = {
            ...media,
            stonedata: { id: savedStone?.id },  // use the confirmed ID
            image_url: media.image_url || '',
            is_image_original: media.is_image_original ?? false,
            video_url: media.video_url || '',
            is_video_original: media.is_video_original ?? false,
            is_manual_upload: media.is_manual_upload ?? false,
          }

          await this.mediaRepo.save(mediaEntity);

        } catch (error) {
          console.log(error);
        }
      }
    })
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

  async searchStonedata(filters: any, page: number, pageSize: number) {
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
        sd.intensity AS "Intensity",
        m.image_url,
        m.video_url,
        m.cert_url 
      FROM stock s
      LEFT JOIN stonedata sd
        ON s.certificate_no = sd.certificate_no
      LEFT JOIN media m
        ON sd.id = m.stone_id
      ${whereClause}
      ORDER BY
    -- First, rows where both imageURL and videoURL are not null and not empty
    (CASE 
        WHEN m.image_url IS NOT NULL AND m.image_url <> '' 
         AND m.video_url IS NOT NULL AND m.video_url <> '' 
        THEN 1 
        ELSE 0 
     END) DESC
    `;
    console.log(baseQuery, params);
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
    // Ensure tmp directory exists
    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Fetch stones from DB with relation
    const stoneData = await this.mediaRepo.find({
      relations: ['stonedata']
    });

    // Get certificate numbers from stones
    const diamondIds = stoneData
      .map(item => item?.stonedata?.certificate_no)
      .filter(Boolean); // remove undefined/null

    // Get vendor data for these diamonds
    const dfrData = await this.getDFEVendorStoneData(diamondIds);

    // Create a lookup map for faster access by certificate number
    const dfrMap = new Map<string, any>();
    dfrData.forEach(item => {
      if (item.cert) {
        dfrMap.set(item.cert, item);
      }
    });

    // Filter stones that have matching data in dfrMap
    const filteredStones = stoneData.filter(item => {
      const certNo = item?.stonedata?.certificate_no;
      return certNo && dfrMap.has(certNo);
    });

    // Loop over filtered stones and process
    const processedMedia = await Promise.all(filteredStones.map(async (stone: any) => {
    
      const certNo = stone.stonedata.certificate_no;
      const vendorData = dfrMap.get(certNo);
    
      const {imageURL,videoURL,certificateURL} = vendorData

      const {gcpVideoUrl,video_url} = await handleVideo(certNo, videoURL)
      const {gcpImageUrl,image_url} = await handleImage(certNo, imageURL)

      const mediaEntity = {
        id: stone.id,
        image_url: gcpImageUrl,
        image_original: image_url,
        video_url: gcpVideoUrl,
        video_original: video_url,
        pdf_url: certificateURL
      }
      await this.mediaRepo.update(stone.id, mediaEntity);
      
      return mediaEntity;
    }));

    return processedMedia;
  }



}
