import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Res, UseGuards } from '@nestjs/common';
import { TruckService } from './truck.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Truck, TruckStatus } from './truck.entity';
import { Response } from 'express';
import { LocationService } from '../location/location.service';
import { AdminOrControlCenterGuard } from '../auth/guards/combine.guard';

@Controller({
    path:'trucks',
    version:'1'
})
export class TruckController {
    constructor(
        private readonly truckService:TruckService,
        private readonly locationService:LocationService
    ) {}

    @Post()
    @UseGuards(AdminOrControlCenterGuard)
    async createTruck(
      @Body() truckData:Partial<Truck>,
      @Res() res:Response
  ): Promise<void> {
      try {
          await this.truckService.createTruck(truckData)
          res.status(HttpStatus.OK)
          res.json({
              message:"truck was created"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get()
    //@UseGuards(AdminGuard)
    async getAllTrucks(
      @Res() res:Response
  ): Promise<void> {
      try {
          const trucks=await this.truckService.getAllTrucks()
          res.status(HttpStatus.OK)
          res.json(trucks)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get('/:id')
    @UseGuards(AdminGuard)
    async getTruckById(
        @Param('id') id:string,
        @Res() res:Response
  ): Promise<void> {
      try {
          const truck=await this.truckService.getTruckById(id)
          res.status(HttpStatus.OK)
          res.json(truck)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Put('/:id')
    @UseGuards(AdminGuard)
    async updateTruck(
      @Body() truckData:Partial<Truck>,
      @Param('id') id:string,
      @Res() res:Response
  ): Promise<void> {
      try {
          await this.truckService.updateTruck(id,truckData)
          res.status(HttpStatus.OK)
          res.json({
              message:"truck was updated"
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
    async deleteTruck(
      @Param('id') id:string,
      @Res() res:Response
  ): Promise<void> {
      try {
          await this.truckService.deleteTruck(id)
          res.status(HttpStatus.OK)
          res.json({
              message:"truck was deleted"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Patch(':id/status')
    @UseGuards(AdminGuard)
    async updateTruckStatus(
      @Param('id') truckId: string,
      @Body('status') status: TruckStatus,
      @Res() res:Response
    ): Promise<void> {
        try {
            await this.truckService.updateTruckStatus(truckId, status);
            res.status(HttpStatus.OK)
            res.json({
                message:"truck status was updated"
            })
        } catch (error) {
            res.status(HttpStatus.BAD_REQUEST)
            res.json({
                message:error.message
            })
        }
    }

     //! Kamyonun canlı konumunu göndermesi.
    @Post(':id/location')
    //@UseGuards(AdminOrControlCenterGuard)
    async updateTruckLocation(
      @Param('id') truckId: string,
      @Body() locationData:Partial<Truck>,
      @Res() res:Response
    ): Promise<void> {
        try {
            console.log(locationData);
            
            await this.truckService.updateTruckLocation(truckId,locationData.current_location)
            res.status(HttpStatus.OK)
            res.json({
                message:"truck location was updated"
            })
        } catch (error) {
            res.status(HttpStatus.BAD_REQUEST)
            res.json({
                message:error.message
            })
        }
    }

     //! kamyondan canlı konum verilerini al 
    @Get(':id/location')
    async getTruckLocation(
        @Param('id') truckId: string
    ) {
      return await this.truckService.getTruckLocation(truckId);
    }
}
