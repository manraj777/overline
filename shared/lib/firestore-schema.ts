export const COLLECTIONS = {
  shops: 'shops',
  users: 'users',
  appointments: 'appointments',
  notifications: 'notifications',
  fraudLogs: 'fraud_logs',
} as const;

export const SUBCOLLECTIONS = {
  queue: 'queue',
  services: 'services',
  activity: 'activity',
} as const;

export const PATHS = {
  shopById: (shopId: string) => `${COLLECTIONS.shops}/${shopId}`,
  shopQueue: (shopId: string) => `${COLLECTIONS.shops}/${shopId}/${SUBCOLLECTIONS.queue}`,
  shopService: (shopId: string, serviceId: string) =>
    `${COLLECTIONS.shops}/${shopId}/${SUBCOLLECTIONS.services}/${serviceId}`,
  userById: (userId: string) => `${COLLECTIONS.users}/${userId}`,
  appointmentById: (appointmentId: string) => `${COLLECTIONS.appointments}/${appointmentId}`,
  notificationById: (id: string) => `${COLLECTIONS.notifications}/${id}`,
  fraudLogById: (id: string) => `${COLLECTIONS.fraudLogs}/${id}`,
};

export const INDEX_HINTS = [
  'shops(city, type, updatedAt desc)',
  'appointments(shopId, scheduleAt asc)',
  'appointments(userId, scheduleAt desc)',
  'notifications(shopId, unread, createdAt desc)',
  'fraud_logs(shopId, severity, createdAt desc)',
];

export const TTL_POLICIES = {
  notificationsDays: 30,
  fraudLogsDays: 90,
  completedQueueArchiveHours: 6,
} as const;
