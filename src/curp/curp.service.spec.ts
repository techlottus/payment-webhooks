import { Test, TestingModule } from '@nestjs/testing';
import { CurpService } from './curp.service';

describe('CurpService', () => {
  let service: CurpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurpService],
    }).compile();

    service = module.get<CurpService>(CurpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
