import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RespondSlotOfferDto {
  @IsBoolean()
  accepted!: boolean;

  @IsOptional()
  @IsBoolean()
  keepWaitlistedOnDecline?: boolean;

  @IsOptional()
  @IsString()
  responseNote?: string;
}
