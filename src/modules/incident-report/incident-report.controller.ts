import { BadRequestException, Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { IncidentReportService } from './incident-report.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { IncidentReport, IncidentStatus } from './incident-report.entity';
import { Response } from 'express';
import { AdminOrControlCenterGuard } from '../auth/guards/combine.guard';
import { DriverGuard } from '../auth/guards/driver.guard';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller({
    path:'incidents',
    version:'1'
})
export class IncidentReportController {
    constructor(private readonly incidentReportService: IncidentReportService) {}

    @Post()
    @UseGuards(DriverGuard)
    async createIncident(
      @Body() incidentData:Partial<IncidentReport>,
      @Res() res:Response
  ): Promise<void> {
      try {
          await this.incidentReportService.createIncident(incidentData)
          res.status(HttpStatus.OK)
          res.json({
              message:"incident was created"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Post('/upload-report-image/:id')
    @UseInterceptors(FilesInterceptor('images'))
    async addProductImages(
      @Param('id') id: string,
      @UploadedFiles() files: Express.Multer.File[],
      @Res() res:Response
    ): Promise<void> {
      try {
          if (!files || files.length === 0) {
              throw new BadRequestException('No files uploaded');
          }        
          await this.incidentReportService.addReviewImages(id, files);
          res.status(HttpStatus.OK)
          res.json({message:"report images was saved"})
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get()
    @UseGuards(AdminOrControlCenterGuard)
    async getIncidentReports(
      @Res() res:Response
  ): Promise<void> {
      try {
          const reports=await this.incidentReportService.getAllIncidents()
          res.status(HttpStatus.OK)
          res.json(reports)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get('/:id')
    @UseGuards(AdminOrControlCenterGuard)
    async getIncidentReport(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          const cluster=await this.incidentReportService.getIncidentById(id)
          res.status(HttpStatus.OK)
          res.json(cluster)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Put('/:id')
    @UseGuards(AdminGuard)
    async updateBin(
      @Body() incidentData:Partial<IncidentReport>,
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.incidentReportService.updateIncident(id,incidentData)
          res.status(HttpStatus.OK)
          res.json({
              message:"report was updated"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Delete('/:id')
    @UseGuards(AdminGuard)
    async deleteCluster(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.incidentReportService.deleteIncident(id)
          res.status(HttpStatus.OK)
          res.json({
              message:"report was deleted"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }


    @Patch(':id/status')
    @UseGuards(AdminOrControlCenterGuard)
    async updateIncidentStatus(
      @Param('id') incidentId: string,
      @Body('status') status: IncidentStatus
    ): Promise<IncidentReport> {
      return await this.incidentReportService.updateIncidentStatus(incidentId, status);
    }


}
