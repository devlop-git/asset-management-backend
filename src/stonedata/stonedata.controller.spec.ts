import { Test, TestingModule } from '@nestjs/testing';
import { StonedataController } from './stonedata.controller';

describe('StonedataController', () => {
  let controller: StonedataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StonedataController],
    }).compile();

    controller = module.get<StonedataController>(StonedataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
