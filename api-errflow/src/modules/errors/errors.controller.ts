import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { QueryErrorsDto } from './dto/query-errors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('errors')
@UseGuards(JwtAuthGuard)
export class ErrorsController {
  constructor(private errorsService: ErrorsService) {}

  @Get()
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryErrorsDto,
  ) {
    return this.errorsService.findAll(organizationId, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.errorsService.findOne(id, organizationId);
  }

  @Patch(':id/ignore')
  async ignore(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.errorsService.ignore(id, organizationId);
  }

  @Post(':id/create-pr-anyway')
  async createPrAnyway(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.errorsService.createPrAnyway(id, organizationId, userId);
  }

  @Post(':id/retry-fix')
  async retryFix(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.errorsService.retryFix(id, organizationId);
  }
}
