import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { ClusterService } from '../cluster/cluster.service';

@Controller({
    path:'admin',
    version:'1'
})
export class AdminController {
  constructor(
    private settingService: SettingsService,
    private clusterService: ClusterService
  ) {}

  @Get('reset-time')
  async getResetTime() {
    return await this.settingService.getResetTime();
  }

  @Post('reset-time')
  async setResetTime(@Body('resetTime') resetTime: string) {
    if (!resetTime || typeof resetTime !== 'string') {
      throw new BadRequestException('Invalid input. resetTime must be a string.');
    }

    try {
      await this.settingService.setResetTime(resetTime);
      await this.clusterService.updateResetSchedule();
      return { message: 'Reset time updated successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}