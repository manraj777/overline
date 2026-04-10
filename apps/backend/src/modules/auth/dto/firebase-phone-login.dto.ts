import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FirebasePhoneLoginDto {
  @ApiProperty({ description: 'Firebase ID token from confirmed phone OTP flow' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({ description: 'Optional role requested by the user' })
  @IsString()
  @IsOptional()
  requestedRole?: string;
}
