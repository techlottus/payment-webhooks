import { Test, TestingModule } from '@nestjs/testing';
import { SalesforceService } from './salesforce.service';

describe('SalesforceService', () => {
  let service: SalesforceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesforceService],
    }).compile();

    service = module.get<SalesforceService>(SalesforceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
