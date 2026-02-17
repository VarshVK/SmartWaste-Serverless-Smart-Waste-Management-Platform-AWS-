import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { Hashing } from 'src/shared/hash/hashing';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports:[
    JwtModule.register({
      global:true,
      secret:'',
      signOptions:{
        expiresIn:'30m'
      }
    })
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    Hashing
  ],
  exports:[UserService]

})
export class UserModule {}
