import { Stonedata } from './entities/stonedata.entity';
import { getIgiReport } from '../utils/igi';
import { Inject, Injectable } from '@nestjs/common';
import { getDiamondCodes } from 'src/utils/common';
import { dfeStoneQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { getStockStonedataJoinQuery } from '../utils/dbQuery';


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

    async formatStoneData() {
        const stoneData: any[] = await this.getDFEStockData();
        if (!stoneData.length) return [];

        const formatedData = getDiamondCodes(stoneData);

        const labDiamondIds = formatedData.lab.map((item: any) => item.diamondCode);
        const naturalDiamondIds = formatedData.natural.map((item: any) => item.diamondCode);

        // flat array from DB
        const dfrData = await this.getDFRStoneData(labDiamondIds, naturalDiamondIds);

        // lookup map by diamond_code
        const dfrMap = new Map(
            dfrData.map((row: any) => [
                row.diamond_code,
                { image_url: row.image_url || null, videourl: row.videourl || null, lab: row.lab || null },
            ]),
        );

        // final transformation
        return stoneData.map((stone: any) => {
            const [labName, code] = stone.StockID.split(" ");
            const isLab = stone.StoneType.toLowerCase().includes("lab");
            const dfrInfo: any = dfrMap.get(code) || {};

            return {
                ...stone,
                diamondCode: code,
                lab: dfrInfo.lab || labName,
                image_url: dfrInfo.image_url || null,
                videourl: dfrInfo.videourl || null,
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
            stock.certficate_no = cert;
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
}
