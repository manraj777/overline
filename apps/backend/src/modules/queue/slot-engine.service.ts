import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { DayOfWeek } from '@prisma/client';

export interface TimeSlot {
  startTime: string; // ISO string
  endTime: string; // ISO string
  available: boolean;
  staffId?: string;
}

export interface SlotQuery {
  shopId: string;
  date: string; // YYYY-MM-DD
  serviceIds: string[];
  duration?: number; // Duration in minutes (used if no serviceIds provided)
  staffId?: string;
}

@Injectable()
export class SlotEngineService {
  private readonly SLOT_INTERVAL_MINUTES = 5; // Slot granularity (exact fitting)

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Calculate available time slots for given services on a date
   */
  async getAvailableSlots(query: SlotQuery): Promise<TimeSlot[]> {
    const { shopId, date, serviceIds, duration, staffId } = query;

    // Check cache first
    const cacheKey = `${shopId}:${date}:${serviceIds.sort().join(',')}:${staffId || 'any'}`;
    const cached = await this.redis.getCachedSlots(cacheKey, date);
    if (cached) {
      return JSON.parse(cached as any);
    }

    // Get shop details
    // Use local-noon to avoid UTC midnight shifting the date to the previous day
    // in negative-offset timezones (e.g. PST/EST).
    const [y, m, d] = date.split('-').map(Number);
    const localNoon = new Date(y, m - 1, d, 12, 0, 0);
    const localDateStart = new Date(y, m - 1, d, 0, 0, 0);
    const localDateEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        workingHours: true,
        specialSchedules: {
          where: {
            // Use local midnight boundaries so the date lookup matches regardless of server TZ
            date: { gte: localDateStart, lte: localDateEnd },
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Calculate total duration from services or use provided duration
    let totalDuration = duration || 30;

    if (serviceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          shopId,
          isActive: true,
        },
      });

      if (services.length !== serviceIds.length) {
        throw new NotFoundException('One or more services not found');
      }

      totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    }

    // Get working hours for the day
    // Use localNoon (local time) — date-only strings like '2026-03-16' parse as UTC
    // midnight, which shifts to the previous calendar day in US timezones.
    const dayOfWeek = this.getDayOfWeek(localNoon);
    const workingHour = shop.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
    const specialSchedule = shop.specialSchedules[0];

    // Check if closed
    if (specialSchedule?.isClosed || workingHour?.isClosed || !workingHour) {
      return [];
    }

    // Get open/close times
    let openTime = specialSchedule?.openTime || workingHour.openTime;
    let closeTime = specialSchedule?.closeTime || workingHour.closeTime;
    const breakWindows = (workingHour.breakWindows as Array<{ start: string; end: string }>) || [];

    if (staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: staffId, shopId, isActive: true },
        select: {
          id: true,
          staffServices: {
            select: {
              serviceId: true,
            },
          },
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff member not found');
      }

      if (serviceIds.length > 0) {
        const staffServiceIds = new Set(staff.staffServices.map((ss) => ss.serviceId));
        const canPerformAllServices = serviceIds.every((serviceId) =>
          staffServiceIds.has(serviceId),
        );
        if (!canPerformAllServices) {
          return [];
        }
      }

      const staffWorkingHour = await this.prisma.staffWorkingHours.findUnique({
        where: {
          staffId_dayOfWeek: {
            staffId,
            dayOfWeek,
          },
        },
      });

      if (staffWorkingHour?.isOff) {
        return [];
      }

      if (staffWorkingHour) {
        const staffIntervals = this.parseStaffIntervals(staffWorkingHour.intervals);
        if (staffIntervals.length === 0) {
          return [];
        }

        openTime = staffIntervals[0].start;
        closeTime = staffIntervals[staffIntervals.length - 1].end;
      }

      const staffTimeOffs = await this.prisma.staffTimeOff.findMany({
        where: {
          staffId,
          startTime: { lt: localDateEnd },
          endTime: { gt: localDateStart },
        },
      });

      for (const timeOff of staffTimeOffs) {
        if (timeOff.isFullDay) {
          return [];
        }

        const clippedWindow = this.clipDateRangeToDay(
          timeOff.startTime,
          timeOff.endTime,
          localDateStart,
          localDateEnd,
        );

        if (clippedWindow) {
          breakWindows.push(clippedWindow);
        }
      }
    }

    // Get existing bookings for the date
    const dateStart = localDateStart;
    const dateEnd = localDateEnd;

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: dateStart, lte: dateEnd },
        status: { in: ['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS'] },
        ...(staffId ? { staffId } : {}),
      },
      select: {
        startTime: true,
        endTime: true,
        staffId: true,
      },
    });

    // Generate all possible slots
    const slots = this.generateSlots(
      date,
      openTime,
      closeTime,
      breakWindows,
      totalDuration,
      existingBookings,
      shop.maxConcurrentBookings,
    );

    // Cache the result for 5 minutes — only cache non-empty results so that
    // a transient [] (e.g. queried before working hours were set up) is never
    // stored as a permanent stale response.
    if (slots.length > 0) {
      await this.redis.cacheSlots(cacheKey, date, JSON.stringify(slots) as any);
    }

    return slots;
  }

  /**
   * Generate time slots for a day
   */
  private generateSlots(
    date: string,
    openTime: string,
    closeTime: string,
    breakWindows: Array<{ start: string; end: string }>,
    serviceDuration: number,
    existingBookings: Array<{ startTime: Date; endTime: Date; staffId: string | null }>,
    maxConcurrent: number,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);

    const startMinutes = openHour * 60 + openMin;
    const endMinutes = closeHour * 60 + closeMin;

    const now = new Date();
    // Use IST (Asia/Kolkata) for "today" check — the EC2 server runs in UTC
    // but all shops operate in IST. Without this, slots for today appear wrong
    // between 00:00–05:30 IST (when UTC date differs from IST date).
    const pad = (n: number) => String(n).padStart(2, '0');
    const istParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now); // returns YYYY-MM-DD
    const localToday = istParts;
    const isToday = date === localToday;
    // Get current IST hours/minutes for filtering past slots
    const istTimeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(now); // returns "HH:MM"
    const [istH, istM] = istTimeParts.split(':').map(Number);
    const currentMinutes = isToday ? istH * 60 + istM : 0;

    // Generate slots at regular intervals
    for (
      let minutes = startMinutes;
      minutes + serviceDuration <= endMinutes;
      minutes += this.SLOT_INTERVAL_MINUTES
    ) {
      // Skip past slots for today
      if (isToday && minutes < currentMinutes + 30) {
        continue; // Require at least 30 min advance booking
      }

      const slotStart = this.minutesToDateTime(date, minutes);
      const slotEnd = this.minutesToDateTime(date, minutes + serviceDuration);

      // Check if slot is during break
      const isDuringBreak = breakWindows.some((brk) => {
        const [brkStartH, brkStartM] = brk.start.split(':').map(Number);
        const [brkEndH, brkEndM] = brk.end.split(':').map(Number);
        const brkStart = brkStartH * 60 + brkStartM;
        const brkEnd = brkEndH * 60 + brkEndM;
        return minutes < brkEnd && minutes + serviceDuration > brkStart;
      });

      if (isDuringBreak) {
        continue;
      }

      // Check availability (count concurrent bookings at this time)
      const concurrentBookings = existingBookings.filter((booking) => {
        const bookingStart = booking.startTime.getTime();
        const bookingEnd = booking.endTime.getTime();
        const slotStartTime = new Date(slotStart).getTime();
        const slotEndTime = new Date(slotEnd).getTime();

        // Check for overlap
        return slotStartTime < bookingEnd && slotEndTime > bookingStart;
      });

      const available = concurrentBookings.length < maxConcurrent;

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available,
      });
    }

    return slots;
  }

  /**
   * Get next available slot for a shop
   */
  async getNextAvailableSlot(shopId: string, serviceIds: string[]): Promise<TimeSlot | null> {
    const today = new Date();

    // Check next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      // Use IST for date string
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(date);

      const slots = await this.getAvailableSlots({
        shopId,
        date: dateStr,
        serviceIds,
      });

      const availableSlot = slots.find((s) => s.available);
      if (availableSlot) {
        return availableSlot;
      }
    }

    return null;
  }

  /**
   * Check if a specific slot is available
   */
  async isSlotAvailable(
    shopId: string,
    startTime: Date,
    endTime: Date,
    staffId?: string,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return false;
    }

    if (staffId) {
      const [staff, staffDayAvailability] = await Promise.all([
        this.prisma.staff.findFirst({
          where: { id: staffId, shopId, isActive: true },
          select: { id: true },
        }),
        this.isStaffAvailableDuringWindow(staffId, startTime, endTime),
      ]);

      if (!staff || !staffDayAvailability) {
        return false;
      }
    }

    const whereClause: any = {
      shopId,
      status: { in: ['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS'] },
      OR: [
        {
          AND: [{ startTime: { lte: startTime } }, { endTime: { gt: startTime } }],
        },
        {
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
        },
        {
          AND: [{ startTime: { gte: startTime } }, { endTime: { lte: endTime } }],
        },
      ],
    };

    if (excludeBookingId) {
      whereClause.id = { not: excludeBookingId };
    }

    if (staffId) {
      whereClause.staffId = staffId;
    }

    const conflictingBookings = await this.prisma.booking.count({
      where: whereClause,
    });

    // If staff-specific, only one booking allowed
    if (staffId) {
      return conflictingBookings === 0;
    }

    // Otherwise, check against max concurrent
    return conflictingBookings < shop.maxConcurrentBookings;
  }

  /**
   * Calculate estimated wait time for a shop
   */
  async calculateWaitTime(shopId: string): Promise<number> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return 0;
    }

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get pending/in-progress bookings for today
    const activeBookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'WAITLISTED'] },
        startTime: {
          gte: todayStart,
          lte: new Date(now.getTime() + 4 * 60 * 60 * 1000), // Next 4 hours
        },
      },
      orderBy: { startTime: 'asc' },
    });

    if (activeBookings.length === 0) {
      return 0;
    }

    // Calculate total duration of pending bookings divided by concurrent capacity
    const totalMinutes = activeBookings.reduce((sum, b) => sum + b.totalDurationMinutes, 0);
    return Math.ceil(totalMinutes / shop.maxConcurrentBookings);
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    // Get the weekday string in IST timezone (e.g. "Monday")
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
    const weekdayStr = formatter.format(date).toUpperCase() as keyof typeof DayOfWeek;
    return DayOfWeek[weekdayStr];
  }

  private async isStaffAvailableDuringWindow(
    staffId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const dayOfWeek = this.getDayOfWeek(startTime);
    const staffWorkingHour = await this.prisma.staffWorkingHours.findUnique({
      where: {
        staffId_dayOfWeek: {
          staffId,
          dayOfWeek,
        },
      },
    });

    if (staffWorkingHour?.isOff) {
      return false;
    }

    if (staffWorkingHour) {
      // Use Intl.DateTimeFormat to get local hours/minutes in IST (shop's timezone)
      // This prevents the server's UTC timezone from making valid slots appear unavailable.
      const istTime = startTime.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Kolkata', 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const [hStart, mStart] = istTime.split(':').map(Number);
      const slotStartMinutes = hStart * 60 + mStart;

      const istEndTime = endTime.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Kolkata', 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const [hEnd, mEnd] = istEndTime.split(':').map(Number);
      const slotEndMinutes = hEnd * 60 + mEnd;

      const intervals = this.parseStaffIntervals(staffWorkingHour.intervals);
      if (intervals.length === 0) {
        return false;
      }

      const fallsWithinAnyInterval = intervals.some((interval) => {
        const workingStartMinutes = this.timeToMinutes(interval.start);
        const workingEndMinutes = this.timeToMinutes(interval.end);
        return slotStartMinutes >= workingStartMinutes && slotEndMinutes <= workingEndMinutes;
      });

      if (!fallsWithinAnyInterval) {
        return false;
      }
    }

    const overlappingTimeOff = await this.prisma.staffTimeOff.findFirst({
      where: {
        staffId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });

    return !overlappingTimeOff;
  }

  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    return hour * 60 + minute;
  }

  private parseStaffIntervals(value: unknown): Array<{ start: string; end: string }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((interval): interval is { start: string; end: string } => {
        return (
          interval !== null &&
          typeof interval === 'object' &&
          typeof (interval as { start?: unknown }).start === 'string' &&
          typeof (interval as { end?: unknown }).end === 'string'
        );
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  private clipDateRangeToDay(
    start: Date,
    end: Date,
    dayStart: Date,
    dayEnd: Date,
  ): { start: string; end: string } | null {
    const clippedStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
    const clippedEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

    if (clippedStart >= clippedEnd) {
      return null;
    }

    // Use IST for time extraction — server may run in UTC
    const fmt = (d: Date) => new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(d);

    return {
      start: fmt(clippedStart),
      end: fmt(clippedEnd),
    };
  }

  private minutesToDateTime(date: string, minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${date}T${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  }
}
