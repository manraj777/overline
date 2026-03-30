import type { Appointment, QueueEntry, Shop, UserProfile } from './types';

export interface SeedPayload {
  shops: Shop[];
  users: UserProfile[];
  queue: QueueEntry[];
  appointments: Appointment[];
}

const now = new Date();
const iso = (minutesFromNow: number) => new Date(now.getTime() + minutesFromNow * 60 * 1000).toISOString();

export const seedPayload: SeedPayload = {
  shops: [
    {
      id: 'shop-grooming-lab',
      name: 'The Grooming Lab',
      type: 'Salon',
      city: 'Bhopal',
      address: 'MP Nagar, Bhopal',
      location: { lat: 23.2599, lng: 77.4126 },
      rating: 4.8,
      averageServiceMinutes: 20,
      services: [
        { id: 'svc-1', name: 'Haircut', price: 200, durationMinutes: 20 },
        { id: 'svc-2', name: 'Beard', price: 150, durationMinutes: 15 },
        { id: 'svc-3', name: 'Facial', price: 400, durationMinutes: 40 },
      ],
      logoUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80',
      updatedAt: iso(-5),
    },
    {
      id: 'shop-clearskin-clinic',
      name: 'ClearSkin Clinic',
      type: 'Clinic',
      city: 'Bhopal',
      address: 'Arera Colony, Bhopal',
      location: { lat: 23.235, lng: 77.397 },
      rating: 4.7,
      averageServiceMinutes: 30,
      services: [
        { id: 'svc-4', name: 'Skin Consult', price: 500, durationMinutes: 30 },
        { id: 'svc-5', name: 'Cleanup', price: 800, durationMinutes: 60 },
      ],
      logoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',
      updatedAt: iso(-12),
    },
    {
      id: 'shop-zen-spa',
      name: 'Zen Spa',
      type: 'Spa',
      city: 'Bhopal',
      address: 'Kolar Road, Bhopal',
      location: { lat: 23.221, lng: 77.43 },
      rating: 4.9,
      averageServiceMinutes: 35,
      services: [
        { id: 'svc-6', name: 'Head Massage', price: 300, durationMinutes: 30 },
        { id: 'svc-7', name: 'Body Massage', price: 600, durationMinutes: 60 },
      ],
      logoUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80',
      updatedAt: iso(-30),
    },
  ],
  users: [
    { id: 'user-1', name: 'Aarav Sharma', mobile: '9876543210', city: 'Bhopal', email: 'aarav@demo.com', location: { lat: 23.258, lng: 77.41 }, createdAt: iso(-2000) },
    { id: 'user-2', name: 'Neha Jain', mobile: '9988776655', city: 'Bhopal', email: 'neha@demo.com', location: { lat: 23.245, lng: 77.42 }, createdAt: iso(-1800) },
    { id: 'user-3', name: 'Kabir Singh', mobile: '9012345678', city: 'Bhopal', email: 'kabir@demo.com', location: { lat: 23.23, lng: 77.4 }, createdAt: iso(-1600) },
    { id: 'user-4', name: 'Diya Patel', mobile: '9090909090', city: 'Bhopal', email: 'diya@demo.com', location: { lat: 23.265, lng: 77.44 }, createdAt: iso(-1400) },
    { id: 'user-5', name: 'Ishan Verma', mobile: '9123456789', city: 'Bhopal', email: 'ishan@demo.com', location: { lat: 23.24, lng: 77.405 }, createdAt: iso(-1200) },
  ],
  queue: [
    {
      id: 'queue-21',
      shopId: 'shop-grooming-lab',
      userId: 'user-1',
      tokenCode: '#0021',
      serviceName: 'Haircut',
      serviceDurationMinutes: 20,
      position: 1,
      aheadCount: 3,
      status: 'waiting',
      joinedAt: iso(-30),
      estimatedWaitMinutes: 24,
      estimatedStartAt: iso(24),
    },
    {
      id: 'queue-22',
      shopId: 'shop-grooming-lab',
      userId: 'user-2',
      tokenCode: '#0022',
      serviceName: 'Beard',
      serviceDurationMinutes: 15,
      position: 2,
      aheadCount: 2,
      status: 'in_progress',
      joinedAt: iso(-40),
      estimatedWaitMinutes: 10,
      estimatedStartAt: iso(10),
    },
    {
      id: 'queue-23',
      shopId: 'shop-grooming-lab',
      userId: 'user-3',
      tokenCode: '#0023',
      serviceName: 'Facial',
      serviceDurationMinutes: 40,
      position: 3,
      aheadCount: 0,
      status: 'completed',
      joinedAt: iso(-80),
      estimatedWaitMinutes: 0,
      estimatedStartAt: iso(-20),
    },
  ],
  appointments: [
    { id: 'ap-1', userId: 'user-1', shopId: 'shop-grooming-lab', serviceName: 'Haircut', tokenCode: '#0021', scheduleAt: iso(40), status: 'upcoming', queueEntryId: 'queue-21', createdAt: iso(-20) },
    { id: 'ap-2', userId: 'user-2', shopId: 'shop-clearskin-clinic', serviceName: 'Skin Consult', tokenCode: '#0104', scheduleAt: iso(1440), status: 'upcoming', createdAt: iso(-60) },
    { id: 'ap-3', userId: 'user-3', shopId: 'shop-zen-spa', serviceName: 'Body Massage', tokenCode: '#0009', scheduleAt: iso(-2880), status: 'completed', createdAt: iso(-4320) },
  ],
};

export async function seedFirestore(
  writeBatch: (collection: string, id: string, payload: unknown) => Promise<void>
): Promise<void> {
  const tasks: Array<Promise<void>> = [];

  for (const shop of seedPayload.shops) {
    tasks.push(writeBatch('shops', shop.id, shop));
  }

  for (const user of seedPayload.users) {
    tasks.push(writeBatch('users', user.id, user));
  }

  for (const appointment of seedPayload.appointments) {
    tasks.push(writeBatch('appointments', appointment.id, appointment));
  }

  for (const entry of seedPayload.queue) {
    tasks.push(writeBatch(`shops/${entry.shopId}/queue`, entry.id, entry));
  }

  await Promise.all(tasks);
}
