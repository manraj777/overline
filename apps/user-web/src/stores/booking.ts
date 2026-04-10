import { create } from 'zustand';
import type { Shop, Service, Staff, TimeSlot } from '@/types';

interface BookingState {
  shop: Shop | null;
  selectedServices: Service[];
  selectedStaff: Staff | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  notes: string;
  offerCode: string | null;
  bookingForOther: boolean;
  customerName: string;
  customerPhone: string;

  setShop: (shop: Shop) => void;
  clearCartAndSetShop: (shop: Shop) => void;
  addService: (service: Service) => void;
  removeService: (serviceId: string) => void;
  toggleService: (service: Service) => void;
  setStaff: (staff: Staff | null) => void;
  setDate: (date: Date) => void;
  setSlot: (slot: TimeSlot | null) => void;
  setNotes: (notes: string) => void;
  setOfferCode: (code: string | null) => void;
  setBookingForOther: (value: boolean) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  getTotalDuration: () => number;
  getTotalPrice: () => number;
  reset: () => void;
}

const initialState = {
  shop: null,
  selectedServices: [],
  selectedStaff: null,
  selectedDate: null,
  selectedSlot: null,
  notes: '',
  offerCode: null,
  bookingForOther: false,
  customerName: '',
  customerPhone: '',
};

export const useBookingStore = create<BookingState>((set, get) => ({
  ...initialState,

  setShop: (shop) => set({ shop }),

  clearCartAndSetShop: (shop) => set({
    ...initialState,
    shop,
  }),

  addService: (service) =>
    set((state) => ({
      selectedServices: [...state.selectedServices, service],
    })),

  removeService: (serviceId) =>
    set((state) => ({
      selectedServices: state.selectedServices.filter((s) => s.id !== serviceId),
    })),

  toggleService: (service) => {
    const { selectedServices } = get();
    const exists = selectedServices.find((s) => s.id === service.id);
    if (exists) {
      set({
        selectedServices: selectedServices.filter((s) => s.id !== service.id),
      });
    } else {
      set({ selectedServices: [...selectedServices, service] });
    }
  },

  setStaff: (staff) => set({ selectedStaff: staff }),

  setDate: (date) => set({ selectedDate: date, selectedSlot: null }),

  setSlot: (slot) => set({ selectedSlot: slot }),

  setNotes: (notes) => set({ notes }),

  setOfferCode: (offerCode) => set({ offerCode }),

  setBookingForOther: (bookingForOther) => set({
    bookingForOther,
    ...(bookingForOther ? {} : { customerName: '', customerPhone: '' }),
  }),

  setCustomerName: (customerName) => set({ customerName }),

  setCustomerPhone: (customerPhone) => set({ customerPhone }),

  getTotalDuration: () => {
    const { selectedServices } = get();
    return selectedServices.reduce((acc, s) => acc + Number(s.durationMinutes || 0), 0);
  },

  getTotalPrice: () => {
    const { selectedServices, offerCode } = get();
    let total = selectedServices.reduce((acc, s) => acc + Number(s.price || 0), 0);
    if (offerCode === 'OVERLINE10') total *= 0.9;
    else if (offerCode === 'OVERLINE20') total *= 0.8;
    else if (offerCode === 'WELCOME50') total = Math.max(0, total - 50);
    return total;
  },

  reset: () => set(initialState),
}));
