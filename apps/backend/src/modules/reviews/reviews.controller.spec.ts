import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;

  const reviewsServiceMock = {
    findForStaff: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: reviewsServiceMock }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('forwards staff reviews query to service with explicit page and limit', async () => {
    reviewsServiceMock.findForStaff.mockResolvedValue({ data: [], stats: {}, meta: {} });

    await controller.findForCurrentStaff('shop-1', { id: 'user-1' }, 2, 15);

    expect(reviewsServiceMock.findForStaff).toHaveBeenCalledWith('shop-1', 'user-1', 2, 15);
  });

  it('falls back to default pagination when page and limit are not provided', async () => {
    reviewsServiceMock.findForStaff.mockResolvedValue({ data: [], stats: {}, meta: {} });

    await controller.findForCurrentStaff('shop-2', { id: 'user-2' });

    expect(reviewsServiceMock.findForStaff).toHaveBeenCalledWith('shop-2', 'user-2', 1, 10);
  });
});
