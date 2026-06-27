import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-errflow-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const validated = await this.apiKeysService.validateApiKey(apiKey);

    if (!validated) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Note: the monthly fix limit is enforced in IngestService, which still
    // records the error (for visibility) but skips the AI pipeline when over
    // limit. The guard only authenticates — it must not drop ingestion.

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
