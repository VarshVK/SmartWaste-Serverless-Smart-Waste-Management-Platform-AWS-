import { BadRequestException, Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { RouteService } from './route.service';
import { AdminOrControlCenterGuard } from '../auth/guards/combine.guard';
import { Response } from 'express';
import { Route, RouteStatus } from './route.entity';
import { DriverGuard } from '../auth/guards/driver.guard';

@Controller({
    path:'routes',
    version:'1'
})
export class RouteController {
    constructor(private readonly routeService:RouteService) {}

    @Post()
    //@UseGuards(AdminOrControlCenterGuard)
    async createOptimizeRoute(
      @Body() routeData:Partial<Route>,
      @Res() res:Response
  ): Promise<void> {
      try {
        console.log(routeData);
        
          await this.routeService.createRoute(routeData)
          res.status(HttpStatus.OK)
          res.json({
              message:"route was created"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    // @Put(':id/realtime')
    // async updateRouteRealTime(@Param('id') routeId: string, @Body() data: { newBinId?: string }) {
    //   return await this.routeService.updateRouteRealTime(routeId, data.newBinId);
    // }

    @Get()
    @UseGuards(AdminOrControlCenterGuard)
    async getRoutes(
      @Res() res:Response
  ): Promise<void> {
      try {
          const routes=await this.routeService.getAllRoutes()
          res.status(HttpStatus.OK)
          res.json(routes)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get('driver')
    @UseGuards(DriverGuard)
    async getDriverRoutes(@Req() req, @Res() res: Response): Promise<void> {
      try {
        const driverId = req.user.id; 
        const routes = await this.routeService.getRoutesByDriverId(driverId);
        console.log(driverId);
        
        res.status(HttpStatus.OK).json(routes);
      } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message,
        });
      }
    }

    @Get('/:id')
    //@UseGuards(AdminOrControlCenterGuard)
    async getRoute(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          const route=await this.routeService.getRouteById(id)
          res.status(HttpStatus.OK)
          res.json(route)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Put('/:id')
    @UseGuards(AdminOrControlCenterGuard)
    async updateRoute(
      @Body() routeData:Partial<Route>,
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.routeService.updateRoute(id,routeData)
          res.status(HttpStatus.OK)
          res.json({
              message:"route was updated"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }


    @Delete('/:id')
    @UseGuards(AdminOrControlCenterGuard)
    async deleteRoute(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.routeService.deleteRoute(id)
          res.status(HttpStatus.OK)
          res.json({
              message:"route was deleted"
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
    async updateRouteStatus(
      @Param('id') routeId: string,
      @Body('status') status: RouteStatus
    ): Promise<Route> {
      return await this.routeService.updateRouteStatus(routeId, status);
    }




    // @Post('optimize')
    // async createOptimizedRoute(
    //     @Body() data: { truckId: string, driverId: string, clusterId: string }
    // ) {
        
    //   return await this.routeService.createOptimizedRoute(data.truckId, data.driverId, data.clusterId);
    // }

    // @Put(':id/realtime')
    // async updateRouteRealTime(
    //     @Param('id') routeId: string,
    //     @Body() data: { newBinId?: string }
    // ){
    //   return await this.routeService.updateRouteRealTime(routeId, data.newBinId);
    // }




}
