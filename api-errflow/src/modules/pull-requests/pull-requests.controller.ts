import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PullRequestsService } from './pull-requests.service';
import { QueryPullRequestsDto } from './dto/query-pull-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('pull-requests')
@UseGuards(JwtAuthGuard)
export class PullRequestsController {
  constructor(private pullRequestsService: PullRequestsService) {}

  @Get()
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryPullRequestsDto,
  ) {
    return this.pullRequestsService.findAll(organizationId, query);
  }
}
