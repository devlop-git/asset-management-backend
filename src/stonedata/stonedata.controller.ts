import { Controller, Get } from '@nestjs/common';
import { StonedataService } from './stonedata.service';
import { getDiamondCodes } from 'src/utils/common';

@Controller('stonedata')
export class StonedataController {
    constructor(private readonly stoneDataService: StonedataService) { }

    @Get('dfe')
    async getData() {
        const stoneData: any = await this.stoneDataService.getDFEStockData();

        if (stoneData.length) {
            const formatedData = getDiamondCodes(stoneData);

            const labDiamondIds = formatedData.lab.map((item: any) => item.diamondCode);
            const naturalDiamondIds = formatedData.natural.map((item: any) => item.diamondCode);

            // fetch from DB
            const dfr = await this.stoneDataService.getDFRStoneData(labDiamondIds,naturalDiamondIds);
            
            // create lookup maps for quick access
            const labMap = new Map(
                dfr.labData.map((row: any) => [
                    row.diamond_code,
                    { image_url: row.image_url || null, videourl: row.videourl || null, lab: row.lab || null },
                ])
            );

            const naturalMap = new Map(
                dfr.naturalData.map((row: any) => [
                    row.diamond_code,
                    { image_url: row.image_url || null, videourl: row.videourl || null, lab: row.lab || null },
                ])
            );

            // map into stoneData
            const finalData = stoneData.map((stone: any) => {
                const code = stone.StockID.split(" ")[1]; // assuming "IGI LG717596099" → "LG717596099"

                if (stone.StoneType.toLowerCase().includes("lab")) {
                    const labInfo: any = labMap.get(code) || {};
                    return {
                        ...stone,
                        diamondCode: code,
                        lab: labInfo.lab || stone.StockID.split(" ")[0],
                        image_url: labInfo.image_url || null,
                        videourl: labInfo.videourl || null,
                        stoneType: "lab",
                    };
                } else {
                    const naturalInfo: any = naturalMap.get(code) || {};
                    return {
                        ...stone,
                        diamondCode: code,
                        lab: naturalInfo.lab || stone.StockID.split(" ")[0],
                        image_url: naturalInfo.image_url || null,
                        videourl: naturalInfo.videourl || null,
                        stoneType: "natural",
                    };
                }
            });

            return finalData;
        }

    }
}
