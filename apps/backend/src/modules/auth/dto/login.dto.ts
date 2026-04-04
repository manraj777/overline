import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({ example: 'OWNER', description: 'Explicit requested role (OWNER, STAFF) for Admin portal', required: false })
  @IsOptional()
  @IsEnum(['OWNER', 'STAFF', 'USER', 'SUPER_ADMIN'])
  requestedRole?: string;
}
