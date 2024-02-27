import { Test, TestingModule } from '@nestjs/testing';
import { CurpController } from './curp.controller';

describe('CurpController', () => {
  let controller: CurpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurpController],
    }).compile();

    controller = module.get<CurpController>(CurpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
