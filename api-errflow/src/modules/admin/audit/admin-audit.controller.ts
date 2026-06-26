import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { AdminAuditService } from "./admin-audit.service";
import { AdminGuard } from "../../../common/guards/admin.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { UseGuards } from "@nestjs/common";

@Controller("admin/audit")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAuditController {
  constructor(private adminAuditService: AdminAuditService) {}

  @Get("logs")
  async getAuditLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("adminId") adminId?: string,
    @Query("action") action?: string,
    @Query("resourceType") resourceType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.adminAuditService.getAuditLogs({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      adminId,
      action,
      resourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get("stats")
  async getAuditStats() {
    return this.adminAuditService.getAuditStats();
  }

  @Get("logs/:id")
  async getAuditLogById(@Param("id") id: string) {
    const log = await this.adminAuditService.getAuditLogById(id);
    if (!log) {
      throw new NotFoundException("Audit log not found");
    }
    return log;
  }
}
