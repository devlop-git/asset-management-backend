import { Body, Controller, Get, Post, Req, UploadedFile, UseInterceptors,Query } from '@nestjs/common';
import { StonedataService } from './stonedata.service';
import { getDiamondCodes } from 'src/utils/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('stonedata')
export class StonedataController {
    constructor(private readonly stoneDataService: StonedataService) { }

    @Get('dfe')
    async getData() {
        return await this.stoneDataService.formatStoneData();
        // const stoneData: any = await this.stoneDataService.getDFEStockData();

        // if (stoneData.length) {
        //     const formatedData = getDiamondCodes(stoneData);

        //     const labDiamondIds = formatedData.lab.map((item: any) => item.diamondCode);
        //     const naturalDiamondIds = formatedData.natural.map((item: any) => item.diamondCode);

        //     // fetch from DB
        //     const dfr = await this.stoneDataService.getDFRStoneData(labDiamondIds,naturalDiamondIds);
            
        //     // create lookup maps for quick access
        //     const labMap = new Map(
        //         dfr.labData.map((row: any) => [
        //             row.diamond_code,
        //             { image_url: row.image_url || null, videourl: row.videourl || null, lab: row.lab || null },
        //         ])
        //     );

        //     const naturalMap = new Map(
        //         dfr.naturalData.map((row: any) => [
        //             row.diamond_code,
        //             { image_url: row.image_url || null, videourl: row.videourl || null, lab: row.lab || null },
        //         ])
        //     );

        //     // map into stoneData
        //     const finalData = stoneData.map((stone: any) => {
        //         const code = stone.StockID.split(" ")[1]; // assuming "IGI LG717596099" → "LG717596099"

        //         if (stone.StoneType.toLowerCase().includes("lab")) {
        //             const labInfo: any = labMap.get(code) || {};
        //             return {
        //                 ...stone,
        //                 diamondCode: code,
        //                 lab: labInfo.lab || stone.StockID.split(" ")[0],
        //                 image_url: labInfo.image_url || null,
        //                 videourl: labInfo.videourl || null,
        //                 stoneType: "lab",
        //             };
        //         } else {
        //             const naturalInfo: any = naturalMap.get(code) || {};
        //             return {
        //                 ...stone,
        //                 diamondCode: code,
        //                 lab: naturalInfo.lab || stone.StockID.split(" ")[0],
        //                 image_url: naturalInfo.image_url || null,
        //                 videourl: naturalInfo.videourl || null,
        //                 stoneType: "natural",
        //             };
        //         }
        //     });

        //     return finalData;
        // }

    }

    @Get('dfe/fetch-save')
    async fetchAndSaveDFEStockData() {
        // This will fetch DFE stock data and save it to Postgres
        return await this.stoneDataService.fetchAndSaveDFEStockData();
    }

    @Post('create-stonedata')
    async createStonedataFromStockApi() {
        await this.stoneDataService.createStonedataFromStock();
        return { message: 'Stonedata creation from stock completed.' };
    }

    @Get('stock-list')
    async getStockList(
        @Query('page') page: string,
        @Query('pageSize') pageSize: string
    ) {
        const pageNum = parseInt(page, 10) || 1;
        const pageSizeNum = parseInt(pageSize, 10) || 20;
        return await this.stoneDataService.getPaginatedIgiList(pageNum, pageSizeNum);
    }
    @Get('stone-details')
    async getStoneDetails(@Query('certificate_no') certificateNo: string) {
        if (!certificateNo) {
            return { error: 'certificate_no query param is required' };
        }
        return await this.stoneDataService.getStonedataByCertificateNo(certificateNo);
    }
    @Post('upload-media')
    @UseInterceptors(FileInterceptor('media'))
    async uploadMedia(
        @Body() body: any,
        @UploadedFile() media:any
    ) {
        // If you want to see all form-data fields, including files and text fields
        console.log('Uploaded file (media):', media);
        console.log('Form fields (body):', body);
     

        return {
            message: 'Media uploaded successfully',
           
        };
    }
}
