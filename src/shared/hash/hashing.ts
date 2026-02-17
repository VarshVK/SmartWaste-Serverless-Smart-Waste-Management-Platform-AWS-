import * as bcrypt from 'bcrypt';

export class Hashing{
    public async hashingPassword(password:string):Promise<string> {
        const salt=await bcrypt.genSalt()        
        const hashedPassword=await bcrypt.hash(password,salt)        
        return hashedPassword
    }

    public async comparePassword(loginPassword:string,userPassword:string):Promise<boolean>{
        return await bcrypt.compare(loginPassword,userPassword)
    }
}