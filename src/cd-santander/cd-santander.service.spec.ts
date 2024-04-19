import { Test, TestingModule } from '@nestjs/testing';
import { CdSantanderService } from './cd-santander.service';

describe('CdSantanderService', () => {
  let service: CdSantanderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CdSantanderService],
    }).compile();

    service = module.get<CdSantanderService>(CdSantanderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
