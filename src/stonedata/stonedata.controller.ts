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
import { getDiamondCodes } from 'src/utils/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { fileUploadToGCP } from 'src/utils/gcpFileUpload';
import { config } from 'dotenv';
import { get } from 'http';
import { getConstant } from 'src/utils/constant';
config();
export class StoneSearchDto {
  tag_no?: string;
  certificate_type?: string[];
  certificate_no?: string[];
  stone_type?: string[];
  shape?: string[];
  carat_from?: number;
  carat_to?: number;
  color?: string[];
  clarity?: string[];
  cut?: string[];
  polish?: string[];
  symmetry?: string[];
  fluorescence?: string[];
  intensity?: string[];
  page?: number;
  pageSize?: number;
}

@Controller('stonedata')
export class StonedataController {
  constructor(private readonly stoneDataService: StonedataService) {}

  @Get('dfe')
  async getData() {
    return await this.stoneDataService.formatStoneData();
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
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 20;
    return await this.stoneDataService.getPaginatedIgiList(
      pageNum,
      pageSizeNum,
    );
  }
  @Get('stone-details')
  async getStoneDetails(@Query('certificate_no') certificateNo: string) {
    if (!certificateNo) {
      return { error: 'certificate_no query param is required' };
    }
    return await this.stoneDataService.getStonedataByCertificateNo(
      certificateNo,
    );
  }
  @Post('upload-media')
  @UseInterceptors(FileInterceptor('media'))
  async uploadMedia(@Body() body: any, @UploadedFile() media: any) {
    try {
      if (!media || !media.originalname) {
        return { error: 'No media file uploaded.' };
      }
      const ext = path.extname(media.originalname);
      const { type, diamond_code, stone_id } = body;

      if (type && diamond_code && stone_id) {
        const destination = `${type.trim()}`; // GCP path
        const filename = `${diamond_code}${ext}`;
        const publicUrl = fileUploadToGCP(destination, filename, media);
        const uploadedPath = `${type.trim()}/${diamond_code}${ext}`;

        await this.stoneDataService.upsertMediaForStone({
          stone_id: Number(stone_id),
          type,
          fileUrl: uploadedPath,
          isOriginal: true,
          isManualUpload: true,
        });
        return {
          imageurl: publicUrl,
          message: 'Media uploaded successfully',
        };
      } else {
        return {
          error: 'Missing required fields: type, diamond_code, or stone_id.',
        };
      }
    } catch (error) {
      return {
        error: error.message || 'An error occurred during media upload.',
      };
    }
  }
  @Get('search')
  async searchStonedata(@Query() query: StoneSearchDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    return await this.stoneDataService.searchStonedata(query, page, pageSize);
  }

  @Get('filterData')
  async getFilterData() {
    return getConstant;
  }
}
