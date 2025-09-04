import { Inject, Injectable } from '@nestjs/common';
import { dfeStoneQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource } from 'typeorm';
import { Stock } from './entities/stock.entity';

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

    async getDFRStoneData(labDiamondIds:any,naturalDiamondIds:any) {
        try {
            const labData = await this.dfrDataSource.query(labStoneQuery(labDiamondIds));
            const naturalData = await this.dfrDataSource.query(naturalStoneQuery(naturalDiamondIds));

            return {labData,naturalData};
        }
        catch (e) {
            console.log(e);
        }
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

}
