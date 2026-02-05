import { create } from 'zustand';
import type { Shop, Service, Staff, TimeSlot } from '@overline/shared';

interface BookingState {
  shop: Shop | null;
  selectedServices: Service[];
  selectedStaff: Staff | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  notes: string;

  setShop: (shop: Shop) => void;
  addService: (service: Service) => void;
  removeService: (serviceId: string) => void;
  toggleService: (service: Service) => void;
  setStaff: (staff: Staff | null) => void;
  setDate: (date: Date) => void;
  setSlot: (slot: TimeSlot | null) => void;
  setNotes: (notes: string) => void;
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
};

export const useBookingStore = create<BookingState>((set, get) => ({
  ...initialState,

  setShop: (shop) => set({ shop }),

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

  getTotalDuration: () => {
    const { selectedServices } = get();
    return selectedServices.reduce((acc, s) => acc + s.durationMinutes, 0);
  },

  getTotalPrice: () => {
    const { selectedServices } = get();
    return selectedServices.reduce((acc, s) => acc + s.price, 0);
  },

  reset: () => set(initialState),
}));
