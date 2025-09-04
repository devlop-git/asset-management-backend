import { Inject, Injectable } from '@nestjs/common';
import { dfeStoneQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource } from 'typeorm';

@Injectable()
export class StonedataService {

    constructor(
        @Inject('MsSqlDataSource') private readonly dataSource: DataSource,
        @Inject('DFRDataSource') private readonly dfrDataSource: DataSource
    ) { }
    async getDFEStockData() {
        try {
            const result = await this.dataSource.query(dfeStoneQuery());
            return result;
        }
        catch (e) {
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

}
