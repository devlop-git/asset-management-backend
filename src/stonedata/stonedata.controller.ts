import { Body, Controller, Get, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { StonedataService } from './stonedata.service';
import { getDiamondCodes } from 'src/utils/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('stonedata')
export class StonedataController {
    constructor(private readonly stoneDataService: StonedataService) { }

    @Get('dfe')
    async getData() {
        return await this.stoneDataService.formatStoneData();
    }

    @Get('dfe/fetch-save')
    async fetchAndSaveDFEStockData() {
        // This will fetch DFE stock data and save it to Postgres
        return await this.stoneDataService.fetchAndSaveDFEStockData();
    }


    @Post('upload-media')
    @UseInterceptors(FileInterceptor('media'))
    async uploadMedia(
        @Body() body: any,
        @UploadedFile() media: any
    ) {
        // If you want to see all form-data fields, including files and text fields
        console.log('Uploaded file (media):', media);
        console.log('Form fields (body):', body);


        return {
            message: 'Media uploaded successfully',

        };
    }
}
