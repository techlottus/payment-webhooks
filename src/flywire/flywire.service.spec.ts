import { Test, TestingModule } from '@nestjs/testing';
import { FlywireService } from './flywire.service';

describe('FlywireService', () => {
  let service: FlywireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlywireService],
    }).compile();

    service = module.get<FlywireService>(FlywireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
