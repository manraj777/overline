import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleBookingDto {
  @ApiProperty({ description: 'New start time (ISO string)' })
  @IsDateString()
  newStartTime: string;
}
