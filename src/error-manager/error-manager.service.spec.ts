import { Test, TestingModule } from '@nestjs/testing';
import { ErrorManagerService } from './error-manager.service';

describe('ErrorManagerService', () => {
  let service: ErrorManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorManagerService],
    }).compile();

    service = module.get<ErrorManagerService>(ErrorManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
