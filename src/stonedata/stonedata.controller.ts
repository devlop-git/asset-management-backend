import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UploadedFile,
    UseInterceptors,
    Query,
    Inject,
    HttpStatus,
    HttpException,
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
import { DataSource, Repository } from 'typeorm';
import { Stonedata } from './entities/stonedata.entity';
import { Media } from './entities/media.entity';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
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
    private stoneRepo: Repository<Stonedata>;
    private mediaRepo: Repository<Media>;
    constructor(
        private readonly stoneDataService: StonedataService,
        private readonly configService: ConfigService,
        @Inject('PostgresDataSource') private readonly pgDataSource: DataSource,
    ) {
        this.stoneRepo = this.pgDataSource.getRepository(Stonedata);
        this.mediaRepo = this.pgDataSource.getRepository(Media);
    }

    // @Get('dfe')
    // async getData() {
    //     return await this.stoneDataService.formatStoneData();
    // }

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
    // @UseInterceptors(ResponseInterceptor)
    async getStoneDetails(@Query('certificate_no') certificateNo: string) {
        try {
            const stoneDetails = await this.stoneDataService.getStonedataByCertificateNo(certificateNo);
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
        // return await this.stoneDataService.automateMediaProcessingAndUpload();
        // const url = 'https://nivoda-inhousemedia.s3.amazonaws.com/inhouse-360-6117790152';
        // const cert = 'LG234567524';
        // return await handleVideo(cert, url);
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



    @Get('search-data')
    async searchStonedata(@Query() query: any) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        return await this.stoneDataService.searchStonedata(query, page, pageSize);
    }

    @Get('filterData')
    async getFilterData() {
        return getConstant;
    }

    @Get('getStoneData')
    async getStoneData() {
        const stoneData = await this.mediaRepo.find({
            relations: ['stonedata']
        });
        return stoneData;
    }
}
