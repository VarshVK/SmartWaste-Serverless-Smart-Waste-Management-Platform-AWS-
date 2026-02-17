import { forwardRef, Module } from '@nestjs/common';
import { IncidentReportService } from './incident-report.service';
import { IncidentReportController } from './incident-report.controller';
import { IncidentReportRepository } from './incident-report.repository';
import { BinModule } from '../bin/bin.module';
import { UserModule } from '../user/user.module';
import { FileService } from 'src/shared/file/file.service';

@Module({
  imports:[forwardRef(() => BinModule),UserModule],
  providers: [IncidentReportService,IncidentReportRepository,FileService],
  controllers: [IncidentReportController],
  exports:[IncidentReportService]
})
export class IncidentReportModule {}
