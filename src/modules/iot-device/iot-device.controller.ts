import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { IoTDeviceService } from './iot-device.service';
import { AdminOrControlCenterGuard } from '../auth/guards/combine.guard';
import { IoTDevice } from './iot-devive.entity';
import { Response } from 'express';
import { SensorData } from './sensor-data.entity';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller({
    path:'sensors',
    version:'1'
})
export class IotDeviceController {
    constructor(private readonly iotDeviceService: IoTDeviceService) {}

    @Post()
    //@UseGuards(AdminOrControlCenterGuard)
    async createSensor(
      @Body() sensorData:Partial<IoTDevice>,
      @Res() res:Response
  ): Promise<void> {
      try {
          await this.iotDeviceService.createDevice(sensorData)
          res.status(HttpStatus.OK)
          res.json({
              message:"sensor was created"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get()
    @UseGuards(AdminOrControlCenterGuard)
    async getSensors(
      @Res() res:Response
  ): Promise<void> {
      try {
          const sensors=await this.iotDeviceService.getAllDevices()
          res.status(HttpStatus.OK)
          res.json(sensors)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Get('/:id')
    @UseGuards(AdminOrControlCenterGuard)
    async getSensor(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          const sensor=await this.iotDeviceService.getDeviceById(id)
          res.status(HttpStatus.OK)
          res.json(sensor)
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }

    @Put('/:id')
    @UseGuards(AdminOrControlCenterGuard)
    async updateSensor(
      @Body() sensorData:Partial<IoTDevice>,
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.iotDeviceService.updateDevice(id,sensorData)
          res.status(HttpStatus.OK)
          res.json({
              message:"sensor was updated"
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
    async deleteSensor(
      @Res() res:Response,
      @Param('id') id:string
  ): Promise<void> {
      try {
          await this.iotDeviceService.deleteDevice(id)
          res.status(HttpStatus.OK)
          res.json({
              message:"sensor was deleted"
          })
      } catch (error) {
          res.status(HttpStatus.BAD_REQUEST)
          res.json({
              message:error.message
          })
      }
    }


    @Post('/:id/data')
    @UseGuards(AdminGuard)
    async addSensorData(
      @Param('id') sensorId: string,
      @Body() sensorData: Partial<SensorData>
    ): Promise<SensorData> {
      return await this.iotDeviceService.addSensorData(sensorId, sensorData);
    }

    @Get(':id/data')
    @UseGuards(AdminGuard)
    async getSensorData(@Param('id') sensorId: string): Promise<SensorData[]> {
      return await this.iotDeviceService.getSensorData(sensorId);
    }
  

}
