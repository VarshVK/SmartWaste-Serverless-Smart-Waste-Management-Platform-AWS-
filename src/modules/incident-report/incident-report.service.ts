import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject, InternalServerErrorException } from '@nestjs/common';
import { IncidentReportRepository } from './incident-report.repository';
import { IncidentReport, IncidentStatus } from './incident-report.entity';
import { UserService } from '../user/user.service';
import { BinService } from '../bin/bin.service';
import { FileService } from '../../shared/file/file.service';

@Injectable()
export class IncidentReportService {
  constructor(
    private readonly incidentReportRepository: IncidentReportRepository,
    private readonly userService: UserService,
    @Inject(forwardRef(() => BinService))
    private readonly binService: BinService,
    private readonly fileService:FileService
  ) {}

  async createIncident(incidentData: Partial<IncidentReport>): Promise<IncidentReport> {
    await this.validateIncidentData(incidentData);
    return await this.incidentReportRepository.create(incidentData);
  }

  async getAllIncidents(): Promise<IncidentReport[]> {
    return await this.incidentReportRepository.findAll();
  }

  async getIncidentById(incidentId: string): Promise<IncidentReport> {
    const incident = await this.incidentReportRepository.findById(incidentId);
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found`);
    }
    return incident;
  }

  async updateIncident(incidentId: string, incidentData: Partial<IncidentReport>): Promise<IncidentReport> {
    const incident = await this.incidentReportRepository.findById(incidentId);
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found`);
    }    
    await this.validateIncidentData(incidentData);
    return this.incidentReportRepository.update(incidentId, incidentData);
  }

  async deleteIncident(incidentId: string): Promise<void> {
    const incident = await this.incidentReportRepository.findById(incidentId);
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found`);
    }    
    await this.incidentReportRepository.delete(incidentId);


  }

  async updateIncidentStatus(incidentId: string, status: IncidentStatus): Promise<IncidentReport> {
    const incident = await this.incidentReportRepository.findById(incidentId);
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found`);
    }    
    if (!Object.values(IncidentStatus).includes(status)) {
      throw new BadRequestException('Invalid incident status');
    }

    const updateData: Partial<IncidentReport> = { status };
    if (status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED) {
      updateData.resolved_at = new Date().toISOString();
    }

    return this.incidentReportRepository.update(incidentId, updateData);
  }

  async addReviewImages(id: string, files: Express.Multer.File[]): Promise<IncidentReport> {
    try {
      const uploadedUrls = await this.fileService.validateAndSaveFiles(files);
      const imageUrls = uploadedUrls.map(url => url);
      return await this.incidentReportRepository.addImagesToReport(id, imageUrls);
    } catch (error) {
      console.error('Error adding review images:', error);
      throw new InternalServerErrorException('resimler eklenirken bir hata oluştu.');
    }
  }

  private async validateIncidentData(incidentData: Partial<IncidentReport>): Promise<void> {
    if (incidentData.reported_by) {
      await this.userService.getUserById(incidentData.reported_by);
    }
    if (incidentData.bin_id) {
      await this.binService.getBinById(incidentData.bin_id);
    }
    if (incidentData.status && !Object.values(IncidentStatus).includes(incidentData.status)) {
      throw new BadRequestException('Invalid incident status');
    }
  }

  


}