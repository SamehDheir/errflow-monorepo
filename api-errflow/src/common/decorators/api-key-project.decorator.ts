import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ApiKeyProject = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const project = request.project;

    return data ? project?.[data] : project;
  },
);
