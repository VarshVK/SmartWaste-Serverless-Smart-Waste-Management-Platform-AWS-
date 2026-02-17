import { Body, Controller, Delete, Get, HttpException, HttpStatus, NotFoundException, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { User } from './user.entity';
import { UserService } from './user.service';
import { Response } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller({
    path:'users',
    version:'1'
})
export class UserController {

    constructor(
        private readonly userService:UserService
    ) {}

    @UseGuards(AdminGuard)
    @Post('/register')
    async signUp(
        @Body() userData:Partial<User>,
        @Res() res:Response
    ):Promise<void>{
        try {
            await this.userService.registerUser(userData)
            res.status(HttpStatus.CREATED)
            res.json({
                message:'user registered successfully'
            })    
        } catch (error) {
            res.status(HttpStatus.BAD_REQUEST)
            res.json({
                message:error.message
            })
        }
    }

    @Post('/reset-password')
    async resetPassword(
      @Body('email') email: string,
      @Body('newPassword') newPassword: string
    ): Promise<{ message: string }> {
      try {        
        await this.userService.resetPassword(email, newPassword);
        return { message: 'Password reset successful' };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('Password reset failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }



    @Get('/:email')
    async getUserByEmail(
        @Param('email') email:string,
        @Res() res:Response
    ):Promise<void>{
        try {
            const user=await this.userService.getUserByEmail(email)
            res.status(HttpStatus.CREATED)
            res.json(user) 
        } catch (error) {
            res.status(HttpStatus.BAD_REQUEST)
            res.json({
                message:error.message
            })
        }
    }


    @Post('/login')
    async login(
    @Body() loginData:Partial<User>,
    @Res() res:Response
    ):Promise<void>{
        try {      
            const access_token = await this.userService.login(loginData);            
            res.status(HttpStatus.OK)
            res.json(
                {
                    "accessToken":access_token,
                    "message":"login is succesfully"
                }
            )
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED)
            res.json({
                message:error.message
            })
        }
    }

    @UseGuards(AdminGuard)
    @Put('/:id')
    async updateProfile(
        @Body() userData: Partial<User>, 
        @Res() res:Response,
        @Param('id') id:string
    ): Promise<void> {
        try {
            await this.userService.updateUser(id,userData)
            res.status(HttpStatus.OK)
            res.json({
                message:'Your profile was updated'
            })
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED)
            res.json({
                message:error.message
            })
        }
    }

    @UseGuards(AdminGuard)
    @Delete('/:id')
    async deleteUser(
        @Body() userData: Partial<User>, 
        @Res() res:Response,
        @Param('id') id:string
    ): Promise<void> {
        try {
            await this.userService.deleteUser(id)
            res.status(HttpStatus.OK)
            res.json({
                message:'Your user was deleted'
            })
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED)
            res.json({
                message:error.message
            })
        }
    }

    @UseGuards(AdminGuard)
    @Get('/:id')
    async getUserById(
        @Body() userData: Partial<User>, 
        @Res() res:Response,
        @Param('id') id:string
    ): Promise<void> {
        try {
            const user=await this.userService.getUserById(id)
            res.status(HttpStatus.OK)
            res.json(user)
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED)
            res.json({
                message:error.message
            })
        }
    }

    @Get()
    async getUsers(
        @Res() res:Response
    ): Promise<void> {
        try {
            const users=await this.userService.getAllUsers()
            res.status(HttpStatus.OK)
            res.json(users)
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED)
            res.json({
                message:error.message
            })
        }
    }

}
