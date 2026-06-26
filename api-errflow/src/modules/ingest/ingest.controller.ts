import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IngestService } from './ingest.service';
import { IngestDto } from './dto/ingest.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyProject } from '../../common/decorators/api-key-project.decorator';

@Controller('ingest')
@UseGuards(ApiKeyGuard)
export class IngestController {
  constructor(private ingestService: IngestService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async ingest(
    @ApiKeyProject() project: any,
    @Body() ingestDto: IngestDto,
  ) {
    return this.ingestService.ingest(project.id, project.organizationId, ingestDto);
  }
}
