import { Test, TestingModule } from '@nestjs/testing';
import { CdSantanderController } from './cd-santander.controller';

describe('CdSantanderController', () => {
  let controller: CdSantanderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CdSantanderController],
    }).compile();

    controller = module.get<CdSantanderController>(CdSantanderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
