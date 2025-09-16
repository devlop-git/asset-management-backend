import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { processAll } from 'src/scripts/diamondScraping';
import { mapReportToStoneAndMedia } from 'src/scripts/scrapepdf';
import { dfeStoneQuery, getStoneVendorQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource, ILike, Repository } from 'typeorm';
import { handleImage, handleVideo } from '../utils/mediaProcessor';
import { Media, Stock, Stonedata } from './entities';

@Injectable()
export class StonedataService {

  constructor(
    @Inject('MsSqlDataSource') private readonly dataSource: DataSource,
    @Inject('DFRDataSource') private readonly dfrDataSource: DataSource,
    @InjectRepository(Stonedata)
    private readonly stoneRepository: Repository<Stonedata>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) { }
  async getDFEStockData(page?: any, limit?: any) {
    try {
      const result = await this.dataSource.query(dfeStoneQuery(page, limit));
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async fetchAndSaveDFEStockData(page, limit) {
    try {
      const result = await this.getDFEStockData(page, limit);
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

  async saveDiamondDataToPostgres(diamondDataArray: any[]) {

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
    await this.stockRepository.save(stocks);
    return stocks;
  }

  async createStonedataFromStock(page: number = 1, pageSize: number = 20) {

    const allStocks = await this.stockRepository.find({
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    await this.processStocks(allStocks, 10, 10000); // 10s delay between requests
  }

  async processStocks(stocks: any[], pageSize = 10, delayMs = 10000) {
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      const parts = (stock.stock || '').split(' ');
      const cert = parts[1];
      const lab = parts[0];

      if (lab === 'IGI' && cert) {
        console.log(`Processing ${i + 1}/${stocks.length}: Cert ${cert}`);
        // const report = await getIgiInfo(cert); // this includes retry logic
        const report = await processAll(cert);

        if (report.length > 0) {
          const { stonedata, media }: any = mapReportToStoneAndMedia(JSON.parse(report)[0], stock); // mapReportToStoneAndMedia(report[0], stock);

          // Create and save stonedata
          const stoneEntity = this.stoneRepository.create(stonedata);
          const savedStone: any = await this.stoneRepository.save(stoneEntity);

          const mediaEntity = {
            ...media,
            stonedata: { id: savedStone?.id },
            image_url: media.image_url || '',
            is_image_original: media.is_image_original ?? false,
            video_url: media.video_url || '',
            is_video_original: media.is_video_original ?? false,
            is_manual_upload: media.is_manual_upload ?? false,
          };

          await this.mediaRepository.save(mediaEntity);

        } else {
          console.log(`Failed for cert ${cert}`);
        }
      }

    }

    console.log('All stocks processed.');
  };


  async getStockWithRelations(certificateNo: string) {
    try {
      console.log("certicateNo", certificateNo);
      const stock = await this.stockRepository.findOne({
        where: { certificate_no: ILike(`%${certificateNo}%`) },
        relations: ['stonedata', 'stonedata.media'], // include relations if present
      });

      return stock;

    } catch (error) {
      console.error('Error fetching stock:', error);
      return {
        success: false,
        error: error.message || error,
      };
    }
  }

  async searchQuery(filters: any, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    console.log(filters);
    const query = this.stockRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.stonedata', 'sd')
      .leftJoinAndSelect('sd.media', 'm');


    const toArray = (val: any) => {
      if (val == null) return undefined;
      return Array.isArray(val) ? val : [val];
    };

    // Filter: tag_no
    if (filters.tag_no) {
      query.andWhere('s.tag_no ILIKE :tagNo', { tagNo: `%${filters.tag_no}%` });
    }

    // Filter: certificate_type
    const certTypeArr = toArray(filters.certificate_type);
    if (certTypeArr?.length) {
      query.andWhere('s.lab IN (:...certTypes)', { certTypes: certTypeArr });
    }

    // Filter: certificate_no
    const certNoArr = toArray(filters.certificate_no);
    if (certNoArr?.length) {
      const conditions = certNoArr.map((_, idx) => `s.certificate_no ILIKE :certNo${idx}`);
      certNoArr.forEach((val, idx) => {
        query.setParameter(`certNo${idx}`, `%${val}%`);
      });
      query.andWhere(`(${conditions.join(' OR ')})`);
    }

    // Filter: stone_type
    const stoneTypeArr = toArray(filters.stone_type);
    if (stoneTypeArr?.length) {
      query.andWhere('s.stone_type IN (:...stoneTypes)', { stoneTypes: stoneTypeArr });
    }

    // Filter: certificateType (if distinct from certificate_type)
    const certificateTypeArr = toArray(filters.certificateType);
    if (certificateTypeArr?.length) {
      const conditions = certificateTypeArr.map((_, idx) => `s.lab ILIKE :certType${idx}`);
      certificateTypeArr.forEach((val, idx) => {
        query.setParameter(`certType${idx}`, `%${val}%`);
      });
      query.andWhere(`(${conditions.join(' OR ')})`);
    }

    // Filter: shape
    const shapeArr = toArray(filters.shape);
    if (shapeArr?.length) {
      query.andWhere('sd.shape IN (:...shapes)', { shapes: shapeArr });
    }

    // Filter: carat range
    if (filters.carat_from != null && filters.carat_to != null) {
      query.andWhere('s.avg_weight BETWEEN :caratFrom AND :caratTo', {
        caratFrom: filters.carat_from,
        caratTo: filters.carat_to,
      });
    }

    // Filter: color
    const colorArr = toArray(filters.color);
    if (colorArr?.length) {
      query.andWhere('sd.color IN (:...colors)', { colors: colorArr });
    }

    // Filter: clarity
    const clarityArr = toArray(filters.clarity);
    if (clarityArr?.length) {
      query.andWhere('sd.clarity IN (:...clarities)', { clarities: clarityArr });
    }

    // Filter: cut
    const cutArr = toArray(filters.cut);
    if (cutArr?.length) {
      query.andWhere('sd.cut IN (:...cuts)', { cuts: cutArr });
    }

    // Filter: polish
    const polishArr = toArray(filters.polish);
    if (polishArr?.length) {
      query.andWhere('sd.polish IN (:...polishes)', { polishes: polishArr });
    }

    // Filter: symmetry
    const symmetryArr = toArray(filters.symmetry);
    if (symmetryArr?.length) {
      query.andWhere('sd.symmetry IN (:...symmetries)', { symmetries: symmetryArr });
    }

    // Filter: fluorescence
    const fluorescenceArr = toArray(filters.fluorescence);
    if (fluorescenceArr?.length) {
      query.andWhere('sd.fluorescence IN (:...fluorescences)', { fluorescences: fluorescenceArr });
    }

    // Filter: intensity
    const intensityArr = toArray(filters.intensity);
    if (intensityArr?.length) {
      query.andWhere('sd.intensity IN (:...intensities)', { intensities: intensityArr });
    }

    // Ordering: prioritize rows with both image and video present
    query.addSelect(`
    CASE 
      WHEN m.image_url IS NOT NULL AND m.image_url <> '' 
       AND m.video_url IS NOT NULL AND m.video_url <> '' 
      THEN 1 ELSE 0 
    END`, 'media_priority');
    query.orderBy('media_priority', 'DESC');

    // Pagination
    query.skip(offset).take(pageSize);
    console.log(query.getSql());

    try {
      const total = await query.getCount();
      const data = await query.getMany();

      return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data
      };
    } catch (error) {
      console.error("💥 Fatal error:", error.message);
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
    const stoneData = await this.mediaRepository.find({
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

      const { imageURL, videoURL, certificateURL } = vendorData

      const { gcpVideoUrl, video_url } = await handleVideo(certNo, videoURL)
      const { gcpImageUrl, image_url } = await handleImage(certNo, imageURL)

      const mediaEntity = {
        id: stone.id,
        image_url: gcpImageUrl,
        image_original: image_url,
        video_url: gcpVideoUrl,
        video_original: video_url,
        pdf_url: certificateURL
      }
      await this.mediaRepository.update(stone.id, mediaEntity);

      return mediaEntity;
    }));

    return processedMedia;
  }

  // dashboard APIs
  async getDashboardData(query: any) {
    // Build filterable WHERE clause using same rules as searchStonedata
    const toArray = (val) => {
      if (val == null) return undefined;
      return Array.isArray(val) ? val : [val];
    };

    const certTypeArr = toArray(query.certificate_type);
    const stoneTypeArr = toArray(query.stone_type);
    const shapeArr = toArray(query.shape);
    const colorArr = toArray(query.color);
    const clarityArr = toArray(query.clarity);

    const qb = this.stockRepository
      .createQueryBuilder('s')
      .leftJoin('s.stonedata', 'sd')
      .leftJoin('sd.media', 'm');

    // Apply filters
    if (certTypeArr?.length) {
      qb.andWhere('s.lab = ANY(:certType)', { certType: certTypeArr });
    }

    if (stoneTypeArr?.length) {
      qb.andWhere('s.stone_type = ANY(:stoneType)', { stoneType: stoneTypeArr });
    }

    if (shapeArr?.length) {
      qb.andWhere('sd.shape = ANY(:shape)', { shape: shapeArr });
    }

    if (colorArr?.length) {
      qb.andWhere('sd.color = ANY(:color)', { color: colorArr });
    }

    if (clarityArr?.length) {
      qb.andWhere('sd.clarity = ANY(:clarity)', { clarity: clarityArr });
    }

    if (query.carat_from != null && query.carat_to != null) {
      qb.andWhere('s.avg_weight BETWEEN :caratFrom AND :caratTo', {
        caratFrom: query.carat_from,
        caratTo: query.carat_to,
      });
    }

    // Count of stones
    const stoneCountQb = this.stockRepository
      .createQueryBuilder('s')
      .leftJoin('s.stonedata', 'sd');

    // Apply same filters
    if (certTypeArr?.length) {
      stoneCountQb.andWhere('s.lab = ANY(:certType)', { certType: certTypeArr });
    }

    if (stoneTypeArr?.length) {
      stoneCountQb.andWhere('s.stone_type = ANY(:stoneType)', { stoneType: stoneTypeArr });
    }

    if (shapeArr?.length) {
      stoneCountQb.andWhere('sd.shape = ANY(:shape)', { shape: shapeArr });
    }

    if (colorArr?.length) {
      stoneCountQb.andWhere('sd.color = ANY(:color)', { color: colorArr });
    }

    if (clarityArr?.length) {
      stoneCountQb.andWhere('sd.clarity = ANY(:clarity)', { clarity: clarityArr });
    }

    if (query.carat_from != null && query.carat_to != null) {
      stoneCountQb.andWhere('s.avg_weight BETWEEN :caratFrom AND :caratTo', {
        caratFrom: query.carat_from,
        caratTo: query.carat_to,
      });
    }

    // Get counts with aggregation
    const countsQb = qb
      .select([
        `COUNT(CASE WHEN m.image_url IS NOT NULL AND m.image_url <> '' THEN 1 END) AS "image_count"`,
        `COUNT(CASE WHEN m.video_url IS NOT NULL AND m.video_url <> '' THEN 1 END) AS "video_count"`,
        `COUNT(CASE WHEN (m.cert_url IS NOT NULL AND m.cert_url <> '') OR (m.pdf_url IS NOT NULL AND m.pdf_url <> '') THEN 1 END) AS "pdf_count"`
      ]);

    const [counts, stoneCount] = await Promise.all([
      countsQb.getRawOne(),
      stoneCountQb.getCount()
    ]);

    return {
      stoneCount: stoneCount,
      imageCount: parseInt(counts?.image_count || '0', 10),
      videoCount: parseInt(counts?.video_count || '0', 10),
      pdfCount: parseInt(counts?.pdf_count || '0', 10),
    };
  }
}
