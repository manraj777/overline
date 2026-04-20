import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class JoinWaitlistDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  serviceId!: string;

  @IsDateString()
  desiredStartTime!: string;

  @IsOptional()
  @IsString()
  preferredStaffProfileId?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  maxWaitMinutes?: number;

  @IsOptional()
  @IsString()
  preferenceNote?: string;
}
