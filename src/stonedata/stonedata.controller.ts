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
import { handleVideo } from 'src/utils/mediaProcessor';
import { ConfigService } from '@nestjs/config';
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
    constructor(
        private readonly stoneDataService: StonedataService,
        private readonly configService: ConfigService,
    ) { }

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
        let stoneDetails;
        try {
            stoneDetails = await this.stoneDataService.getStonedataByCertificateNo(certificateNo);
            return stoneDetails;
        } catch (err) {
            // Log error and return a user-friendly message
            console.error('Error fetching stone details:', err);
            return { error: 'Failed to fetch stone details.' };
        }
    }

    @Post('automate-media')
    async automateMedia() {
        // return await this.stoneDataService.automateMediaProcessingAndUpload();
        const url = 'https://nivoda-inhousemedia.s3.amazonaws.com/inhouse-360-6117790152';
        const cert = 'LG234567524';
        return await handleVideo(cert, url);
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
    async searchStonedata(@Query() query: StoneSearchDto) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        return await this.stoneDataService.searchStonedata(query, page, pageSize);
    }

    @Get('filterData')
    async getFilterData() {
        return getConstant;
    }

    @Get('upload-assets')
    async uploadAsset() {
        const data = await this.stoneDataService.insertMediaData()
        return data;
    }
}
