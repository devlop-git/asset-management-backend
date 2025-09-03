import { Controller, Get } from '@nestjs/common';
import { StonedataService } from './stonedata.service';

@Controller('stonedata')
export class StonedataController {
    constructor(private readonly stoneDataService: StonedataService) { }

    @Get('dfe')
    async getData() {
        return this.stoneDataService.getDiamondData();
    }
}
