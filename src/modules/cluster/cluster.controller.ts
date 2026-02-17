import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { ClusterService } from './cluster.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Cluster, ClusterStatus } from './cluster.entity';
import { Response } from 'express';
import { AdminOrControlCenterGuard } from '../auth/guards/combine.guard';
import { DriverGuard } from '../auth/guards/driver.guard';
import { Request } from 'express';


@Controller({
    path:'clusters',
    version:'1'
})
export class ClusterController {
    constructor(private readonly clusterService:ClusterService){}

    @Get()
    //@UseGuards(AdminOrControlCenterGuard)
    async getClusters(
      @Res() res:Response
  ): Promise<void> {
      try {
          const clusters=await this.clusterService.getAllClusters()
          res.status(HttpStatus.OK)
          res.json(clusters)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get('/:id')
    @UseGuards(AdminOrControlCenterGuard)
    async getCluster(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          const cluster=await this.clusterService.getClusterById(id)
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
      @Body() clusterData:Partial<Cluster>,
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.clusterService.updateCluster(id,clusterData)
          res.status(HttpStatus.OK)
          res.json({
              message:"cluster was updated"
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
          await this.clusterService.deleteCluster(id)
          res.status(HttpStatus.OK)
          res.json({
              message:"cluster was deleted"
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
    async updateClusterStatus(
      @Param('id') clusterId: string,
      @Body('status') status: ClusterStatus
    ): Promise<Cluster> {
      return await this.clusterService.updateClusterStatus(clusterId, status);
    }

    @Post('/assign-to-driver')
    @UseGuards(DriverGuard) 
    async assignClusterToDriver(
      @Req() req,
      @Res() res: Response
    ): Promise<void> {
      try {
        const driverId = req.user.id; // Kullanıcı kimliğini request'ten alıyoruz
        const assignedCluster = await this.clusterService.assignClusterToDriver(driverId);
        console.log(assignedCluster);
        
        res.status(HttpStatus.OK).json(assignedCluster);
      } catch (error) {
        res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message
        });
      }
    }


    



}
