import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ClusterService } from '../cluster/cluster.service';
import { SettingsService } from '../settings/settings.service';
import { ClusterModule } from '../cluster/cluster.module';

@Module({
  imports:[ClusterModule],
  providers: [SettingsService],
  controllers: [AdminController],

})
export class AdminModule {}
