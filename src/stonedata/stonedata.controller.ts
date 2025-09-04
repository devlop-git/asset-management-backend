import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UploadedFile,
    UseInterceptors,
    Query,
  } from '@nestjs/common';
  import { StonedataService } from './stonedata.service';
  import { FileInterceptor } from '@nestjs/platform-express';
  import * as path from 'path';
  import { fileUploadToGCP } from 'src/utils/gcpFileUpload';
  import { config } from 'dotenv';
  config();
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
    async uploadMedia(@Body() body: any, @UploadedFile() media: any) {
      const diamond_code = '12345678923';
      const ext = path.extname(media.originalname);
      const { type } = body;
  
  
      const destination = `${type}`; // GCP path
      const filename = `${diamond_code}${ext}`;
      const publicUrl = fileUploadToGCP(destination, filename, media);
      return {
        file: publicUrl,
        message: 'Media uploaded successfully',
      };
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
}
