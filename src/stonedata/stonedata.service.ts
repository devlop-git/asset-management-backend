import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class StonedataService {

    constructor(private readonly dataSource: DataSource) {}
    async getDiamondData() {
    const query = `
      SELECT
          dds.*,
          acs."ItemName",
          acs."ItemTypeNM",
          acs."TagNo",
          acs."CostPrice",
          acsb."RawMaterialTypeNm",
          acs."ProductID",
          acsb."StockBOMID"
      FROM "DiamondDemandSheet" dds
      INNER JOIN "AcCurrentStock" acs
          ON dds."OrderNo" = acs."OrderNo"
      INNER JOIN "AcCurrentStockBOM" acsb
          ON acs."StockID" = acsb."StockID"
      WHERE acsb."RawMaterialTypeNm" IN ('Diamond','Lab-created diamond')
        AND dds."Status" IN (
              'Received',
              'Vendor Assign',
              'Vendor Assign Internatioanly',
              'Vendor Assign Internationally',
              'Order Placed'
          )
        AND dds."AvgWt" > 0.17
        AND dds."StockID" IS NOT NULL
      ORDER BY dds."OrderRecdDate" DESC
    `;

    const result = await this.dataSource.query(query);
    return result;
  }

}
