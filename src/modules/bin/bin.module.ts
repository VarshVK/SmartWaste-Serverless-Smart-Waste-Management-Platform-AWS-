import { forwardRef, Module } from '@nestjs/common';
import { BinService } from './bin.service';
import { BinController } from './bin.controller';
import { BinRepository } from './bin.repository';
import { ClusterService } from '../cluster/cluster.service';
import { ClusterModule } from '../cluster/cluster.module';
import { IncidentReportModule } from '../incident-report/incident-report.module';
import { FileService } from 'src/shared/file/file.service';

@Module({
  imports: [
    forwardRef(() => ClusterModule),
    forwardRef(() => IncidentReportModule)],
  providers: [BinService,BinRepository,FileService],
  controllers: [BinController],
  exports:[BinService]

})
export class BinModule {}
