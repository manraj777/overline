import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID token from frontend Google Sign-In' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({
    description: 'Explicit requested role context (OWNER, STAFF, USER, SUPER_ADMIN)',
    required: false,
    example: 'OWNER',
  })
  @IsOptional()
  @IsEnum(['OWNER', 'STAFF', 'USER', 'SUPER_ADMIN'])
  requestedRole?: string;
}
