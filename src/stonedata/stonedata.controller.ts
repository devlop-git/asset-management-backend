import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Query,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { config } from 'dotenv';
import * as path from 'path';
import { getConstant } from 'src/utils/constant';
import { fileUploadToGCP } from 'src/utils/gcpFileUpload';
import { DataSource } from 'typeorm';
import { StonedataService } from './stonedata.service';
config();
export class StoneSearchDto {
    tag_no?: string;
    certificate_type?: string | string[];
    certificate_no?: string | string[];
    stone_type?: string | string[];
    shape?: string | string[];
    color?: string | string[];
    clarity?: string | string[];
    carat_from?: number;
    carat_to?: number;
    cut?: string | string[];
    polish?: string | string[];
    symmetry?: string | string[];
    fluorescence?: string | string[];
    intensity?: string | string[];
    page?: number;
    pageSize?: number;
}

@Controller('stonedata')
export class StonedataController {
    constructor(
        private readonly stoneDataService: StonedataService,
        private readonly configService: ConfigService,
        @Inject('PostgresDataSource') private readonly pgDataSource: DataSource,
    ) {}

   
    @Get('dfe/fetch-save')
    async fetchAndSaveDFEStockData(
        @Query('page') page: string,
        @Query('pageSize') pageSize: string,
    ) {
        // This will fetch DFE stock data and save it to Postgres
        return await this.stoneDataService.fetchAndSaveDFEStockData(parseInt(page),parseInt(pageSize));
    }

    @Post('create-stonedata')
    
    async createStonedataFromStockApi(
        @Query('page') page: string,
        @Query('pageSize') pageSize: string,
    ) {
        return this.stoneDataService.createStonedataFromStock(parseInt(page),parseInt(pageSize));
        // return { message: 'Stonedata creation from stock completed.' };
    }

    @Get('stone-details')
    // @UseInterceptors(ResponseInterceptor)
    async getStoneDetails(@Query('certificate_no') certificateNo: string) {
        try {
            const stoneDetails = await this.stoneDataService.getStockWithRelations(certificateNo);
            if (!stoneDetails) {
                throw new HttpException('Stone Not Found', HttpStatus.NOT_FOUND);
            }
            return stoneDetails;
        } catch (err) {
            throw new HttpException('Stone Not Found', HttpStatus.NOT_FOUND);
        }
    }

    @Post('automate-media')
    async automateMedia() {
        return await this.stoneDataService.automateMediaProcessingAndUpload();
    }

    @Post('upload-media')
    @UseInterceptors(FileInterceptor('media'))
    async uploadMedia(@Body() body: any, @UploadedFile() media: any) {
        const diamond_code = '1234567890';
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



    @Get('search')
    async searchStonedata(@Query() query: any) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        return await this.stoneDataService.searchQuery(query, page, pageSize);
    }

    @Get('filterData')
    async getFilterData() {
        return getConstant;
    }

    @Get('dashboard')
    async getDashboardData(@Query() query: any) {
        return await this.stoneDataService.getDashboardData(query);
    }
}
