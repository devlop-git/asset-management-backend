import { Stonedata } from './entities/stonedata.entity';
import { getIgiReport } from '../utils/igi';
import { Inject, Injectable } from '@nestjs/common';
import { getDiamondCodes } from 'src/utils/common';
import { dfeStoneQuery, getStoneVendorQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { getStockStonedataJoinQuery } from '../utils/dbQuery';
import { StoneSearchDto } from './stonedata.controller';


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
    console.log(dfrMap);
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
      stock.stone_type = item.StoneType || '';
      stock.lab = item.LabNm || '';
      stock.supplier = item.SupplierName || '';
      stock.dfr_supplier = item.DFR_SupplierName || '';
      stock.dfr_vendor = item.DFR_Vendor || '';
      stock.dfr_cert = item.DFR_CertificateNo || '';
      stock.is_certified_stone = true;
      stock.is_active = true;
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
      console.log("parts:", parts);
      console.log(parts[1], process.env.IGI_SUBSCRIPTION_KEY);
      if (parts[0].toUpperCase() === 'IGI' && parts[1]) {
        try {
          const igiData = await getIgiReport(parts[1], process.env.IGI_SUBSCRIPTION_KEY);
          // Map igiData to stonedata entity fields
          const stonedata = stonedataRepo.create({
            certificate_no: String(igiData.certificate_no ?? ''), // Use correct property name as per Stonedata entity
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
            // Remove 'culet' if not defined in Stonedata entity
            depth: typeof igiData.depth === 'number' ? igiData.depth : Number(igiData.depth) || 0,
            table: String(igiData.table ?? ''),
            is_active: true,
            // add other fields as needed
          });
          await stonedataRepo.save(stonedata);
        } catch (e) {
          console.error(`Failed for cert ${parts[1]}:`, e);
        }
      }
    }
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
    const repo = this.pgDataSource.getRepository(Stonedata);
    return await repo.findOne({ where: { certificate_no: certificateNo } });
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
      where.push(`s.certificate_no = ANY($${paramIndex})`);
      params.push(certNoArr);
      paramIndex++;
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
}
