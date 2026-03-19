import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ description: 'Phone number in E.164 format, e.g. +919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
