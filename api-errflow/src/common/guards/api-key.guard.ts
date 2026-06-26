import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard {
  constructor(
    private reflector: Reflector,
    private apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-errflow-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const validated = await this.apiKeysService.validateApiKey(apiKey);

    if (!validated) {
      throw new UnauthorizedException('Invalid API key');
    }

    const { organization } = validated;

    if (organization.fixesLimit && organization.fixesUsedThisMonth >= organization.fixesLimit) {
      throw new HttpException(
        {
          error: 'Monthly fix limit reached',
          limit: organization.fixesLimit,
          used: organization.fixesUsedThisMonth,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    request.user = {
      id: validated.apiKey.id,
      organizationId: validated.apiKey.organizationId,
      projectId: validated.apiKey.projectId,
      isApiKey: true,
    };

    request.project = validated.project;
    request.organization = validated.organization;

    return true;
  }
}
