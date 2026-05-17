import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FacebookLoginDto {
  @ApiProperty({ description: 'Facebook access token from frontend' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: 'Explicit requested role context (OWNER, STAFF, USER, SUPER_ADMIN)',
    required: false,
    example: 'USER',
  })
  @IsOptional()
  @IsEnum(['OWNER', 'STAFF', 'USER', 'SUPER_ADMIN'])
  requestedRole?: string;
}
