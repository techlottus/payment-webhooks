import { Test, TestingModule } from '@nestjs/testing';
import { SalesforceController } from './salesforce.controller';

describe('SalesforceController', () => {
  let controller: SalesforceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesforceController],
    }).compile();

    controller = module.get<SalesforceController>(SalesforceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
