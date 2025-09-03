import { Test, TestingModule } from '@nestjs/testing';
import { StonedataService } from './stonedata.service';

describe('StonedataService', () => {
  let service: StonedataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StonedataService],
    }).compile();

    service = module.get<StonedataService>(StonedataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
