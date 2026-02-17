import { BadRequestException, Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { Bin, BinStatus } from './bin.entity';
import { Response } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BinService } from './bin.service';
import { AdminOrControlCenterGuard } from '../auth/guards/combine.guard';
import { DriverGuard } from '../auth/guards/driver.guard';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller({
    path:'bins',
    version:'1'
})
export class BinController {
    constructor(private readonly binService:BinService) {}
    
    @Post()
    //@UseGuards(AdminGuard)
    async createBin(
      @Body() binData:Partial<Bin>,
      @Res() res:Response
  ): Promise<void> {
      try {
          await this.binService.createBin(binData)
          res.status(HttpStatus.OK)
          res.json({
              message:"bin was created"
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
          await this.binService.addReviewImages(id, files);
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
    //@UseGuards(AdminOrControlCenterGuard)
    async getBins(
      @Res() res:Response
  ): Promise<void> {
      try {
          const bins=await this.binService.getAllBins()
          res.status(HttpStatus.OK)
          res.json(bins)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get('/:id')
    async getBin(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          const bin=await this.binService.getBinById(id)
          res.status(HttpStatus.OK)
          res.json(bin)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Put('/:id')
    //@UseGuards(AdminGuard)
    async updateBin(
      @Body() binData:Partial<Bin>,
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.binService.updateBin(id,binData)
          res.status(HttpStatus.OK)
          res.json({
              message:"bin was updated"
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
    async deleteBin(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.binService.deleteBin(id)
          res.status(HttpStatus.OK)
          res.json({
              message:"bin was deleted"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Patch('/:id/status')
    @UseGuards(DriverGuard)
    async updateBinStatus(
      @Param('id') binId: string,
      @Body() statusData: { status: BinStatus; current_fill_level: number }
    ): Promise<Bin> {
      return await this.binService.updateBinStatus(binId, statusData.status, statusData.current_fill_level);
    }

    @Post(':id/geo-fence-alert')
    //@UseGuards(AdminGuard)
    async checkGeoFence(
      @Param('id') binId: string,
      @Body() locationData: { latitude: number; longitude: number }
    ): Promise<{ isWithinFence: boolean; bin: Bin }> {
      return await this.binService.checkGeoFence(binId, locationData.latitude, locationData.longitude);
    }
    
}
