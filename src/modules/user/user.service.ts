import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User, UserRole, UserStatus } from './user.entity';
import { v4 as uuidv4 } from 'uuid'; // Import the uuidv4 function
import { Hashing } from '../../shared/hash/hashing';
import { Payload } from '../auth/jwt.payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository:UserRepository,
        private readonly hashing:Hashing,
        private readonly jwtService:JwtService
    ){}

    async registerUser(userData: Partial<User>): Promise<User> {
        const hashedPassword=await this.hashing.hashingPassword(userData.password_hash)
        const now = Date.now();        
        const newUser: User = {
          user_id: uuidv4(), 
          username: userData.username,
          password_hash: hashedPassword,
          email: userData.email,
          phone_number: userData.phone_number,
          role: userData.role || UserRole.DRIVER,
          status: UserStatus.ACTIVE,
          last_login: null,
          created_at: now,
          updated_at: now,
          company_id:uuidv4(),
        };
        return this.userRepository.create(newUser);
    }

    async updateUser(user_id: string, userData: Partial<User>): Promise<User> {
        const user = await this.userRepository.findById(user_id);
        console.log(user);
        
        if (!user) {
          throw new Error('User not found');
        }        
        const updatedUser: User = { ...user, ...userData, updated_at: Date.now() };        
        return await this.userRepository.update(updatedUser);
    }

    async deleteUser(userId: string): Promise<void> {
      return await this.userRepository.delete(userId);
    }

    async getUserById(userId: string): Promise<User> {
      return await this.userRepository.findById(userId);
    }

    async getAllUsers(): Promise<User[]> {
      return await this.userRepository.findAll();
    }

    async login(loginData:Partial<User>):Promise<string>{
      try {
          const user=await this.userRepository.findByEmail(loginData.email)          
          user.last_login=Date.now()          
          await this.userRepository.update(user);
          if(!user || !(await this.hashing.comparePassword(loginData.password_hash,user.password_hash))){
              throw new UnauthorizedException('Invalid credentials');
          }
          const payload:Payload={id:user.user_id,email:user.email,role:user.role}
          return await this.jwtService.signAsync(payload)
      } catch (error) {
          throw new Error(error.message)
      }
    }

    async getUserByEmail(email:string):Promise<User>{
      try {
        const user=await this.userRepository.findByEmail(email)
        return user
      } catch (error) {
        throw new Error(error.message)
      }
    }

    async resetPassword(email: string, newPassword: string): Promise<void> {
      const user = await this.userRepository.findByEmail(email);      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const hashedPassword = await this.hashing.hashingPassword(newPassword);
      await this.userRepository.updatePasswordHash(user.user_id, hashedPassword);
    }







    
    

}
