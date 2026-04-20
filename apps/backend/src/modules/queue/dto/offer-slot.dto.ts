import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class OfferSlotDto {
  @IsString()
  bookingId!: string;

  @IsDateString()
  slotStartTime!: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  message?: string;
}
