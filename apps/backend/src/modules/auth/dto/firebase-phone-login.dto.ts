import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FirebasePhoneLoginDto {
  @ApiProperty({ description: 'Firebase ID token from confirmed phone OTP flow' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
