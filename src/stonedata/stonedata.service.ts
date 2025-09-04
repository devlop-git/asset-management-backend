import { Inject, Injectable } from '@nestjs/common';
import { getDiamondCodes } from 'src/utils/common';
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
            const dfrInfo:any = dfrMap.get(code) || {};

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


}
