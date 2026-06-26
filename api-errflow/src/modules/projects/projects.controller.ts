import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@prisma/client";

@Controller("projects")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async create(
    @CurrentUser("organizationId") organizationId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(organizationId, createProjectDto);
  }

  @Get()
  async findAll(@CurrentUser("organizationId") organizationId: string) {
    return this.projectsService.findAll(organizationId);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
  ) {
    return this.projectsService.findOne(id, organizationId);
  }

  @Patch(":id")
  @Roles(Role.OWNER, Role.ADMIN)
  async update(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, organizationId, updateProjectDto);
  }

  @Delete(":id")
  @Roles(Role.OWNER, Role.ADMIN)
  async remove(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
  ) {
    return this.projectsService.remove(id, organizationId);
  }
}
