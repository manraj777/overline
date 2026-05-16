import { create } from 'zustand';

interface IncomingBooking {
  title: string;
  body: string;
  bookingNumber?: string;
}

interface AlertStore {
  newBooking: IncomingBooking | null;
  setNewBooking: (b: IncomingBooking | null) => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  newBooking: null,
  setNewBooking: (newBooking) => set({ newBooking }),
}));
