import { IsNotEmpty, IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Booking ID to review' })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'Rating 1-5 stars', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Review comment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ description: 'Staff rating 1-5 stars', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  staffRating?: number;
}

export class ReplyReviewDto {
  @ApiProperty({ description: 'Reply to the review' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reply: string;
}
