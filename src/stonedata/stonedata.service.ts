import { Inject, Injectable } from '@nestjs/common';
import { dfeStoneQuery, labStoneQuery, naturalStoneQuery } from 'src/utils/dbQuery';
import { DataSource } from 'typeorm';

@Injectable()
export class StonedataService {

    constructor(@Inject('MsSqlDataSource') private readonly dataSource: DataSource) { }
    async getDFEStockData() {
        try {
            const result = await this.dataSource.query(dfeStoneQuery());
            return result;
        }
        catch (e) {
            console.log(e);
        }
    }

    async getDFRStoneData(diamond_codes:any) {
        try {
            const labData = await this.dataSource.query(labStoneQuery(diamond_codes));
            const naturalData = await this.dataSource.query(naturalStoneQuery(diamond_codes));

            console.log(labData,naturalData);
            return {labData,naturalData};
        }
        catch (e) {
            console.log(e);
        }
    }

}
