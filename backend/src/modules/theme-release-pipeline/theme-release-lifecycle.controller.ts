import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { ThemeReleaseLifecycleService } from './theme-release-lifecycle.service';

type LifecycleBody = {
  idempotencyKey: string;
  expectedRevision: number;
  comment?: string;
  metadata?: Record<string, unknown>;
};

@Controller('internal/theme-releases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
export class ThemeReleaseLifecycleController {
  constructor(private readonly lifecycle: ThemeReleaseLifecycleService) {}

  @Post(':candidateId/draft')
  draft(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.transition(
      this.request(candidateId, body, req),
      'draft',
      'DRAFT',
    );
  }

  @Post(':candidateId/edit')
  edit(
    @Param('candidateId') candidateId: string,
    @Body()
    body: LifecycleBody & {
      releaseNotes?: string;
      changelog?: Array<Record<string, unknown>>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.editDraft(this.request(candidateId, body, req), body);
  }

  @Post(':candidateId/review')
  review(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.transition(
      this.request(candidateId, body, req),
      'review',
      'IN_REVIEW',
    );
  }

  @Post(':candidateId/approve')
  approve(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.transition(
      this.request(candidateId, body, req),
      'approve',
      'APPROVED',
    );
  }

  @Post(':candidateId/reject')
  reject(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.transition(
      this.request(candidateId, body, req),
      'reject',
      'REJECTED',
    );
  }

  @Post(':candidateId/publish')
  publish(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.transition(
      this.request(candidateId, body, req),
      'publish',
      'PUBLISHED',
    );
  }

  @Post(':candidateId/deprecate')
  deprecate(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.transition(
      this.request(candidateId, body, req),
      'deprecate',
      'DEPRECATED',
    );
  }

  @Post(':candidateId/archive')
  archive(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.transition(
      this.request(candidateId, body, req),
      'archive',
      'ARCHIVED',
    );
  }

  @Post(':candidateId/rollback-metadata')
  rollbackMetadata(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody & { metadata: Record<string, unknown> },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.addRollbackMetadata(
      this.request(candidateId, body, req),
      body.metadata,
    );
  }

  @Post(':candidateId/reviewers')
  assignReviewer(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody & { reviewerUserId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.assignReviewer(
      this.request(candidateId, body, req),
      body.reviewerUserId,
    );
  }

  @Post(':candidateId/comments')
  comment(
    @Param('candidateId') candidateId: string,
    @Body() body: LifecycleBody & { body: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.lifecycle.addComment(
      this.request(candidateId, body, req),
      body.body,
    );
  }

  @Get(':candidateId/timeline')
  timeline(@Param('candidateId') candidateId: string) {
    return this.lifecycle.timeline(candidateId);
  }

  @Get(':candidateId/compare/:otherCandidateId')
  compare(
    @Param('candidateId') candidateId: string,
    @Param('otherCandidateId') otherCandidateId: string,
  ) {
    return this.lifecycle.comparison(candidateId, otherCandidateId);
  }

  @Get('metrics')
  metrics() {
    return this.lifecycle.metricsSnapshot();
  }

  private request(
    candidateId: string,
    body: LifecycleBody,
    req: AuthenticatedRequest,
  ) {
    return {
      ...body,
      candidateId,
      actor: { userId: req.user.sub, role: req.user.role },
    };
  }
}
