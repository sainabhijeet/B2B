import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  @Get()
  check() {
    return {
      success: true,
      data: { status: 'ok' },
      meta: {},
      message: '',
    };
  }
}
