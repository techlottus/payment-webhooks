import { Test, TestingModule } from '@nestjs/testing';
import { FlywireController } from './flywire.controller';

describe('FlywireController', () => {
  let controller: FlywireController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlywireController],
    }).compile();

    controller = module.get<FlywireController>(FlywireController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
