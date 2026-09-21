import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifyGstDto } from './dto/verify-gst.dto';
import { GstService } from './gst.service';

@Controller('gst')
@ApiTags('GST')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class GstController {
  constructor(private readonly gst: GstService) {}

  @Post('verify')
  verify(@Body() dto: VerifyGstDto) {
    return this.gst.verifyGstin(dto.gstin);
  }
}
