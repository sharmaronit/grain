import { create } from "zustand";
import type { AppTab, Quadrant } from "../components/types";

interface AppState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  timeFilter: "all" | "morning" | "afternoon" | "evening";
  setTimeFilter: (filter: "all" | "morning" | "afternoon" | "evening") => void;

  isProfileOpen: boolean;
  setProfileOpen: (isOpen: boolean) => void;

  editHabitTarget: { q: Quadrant; i: number; id?: string } | null;
  setEditHabitTarget: (target: { q: Quadrant; i: number; id?: string } | null) => void;

  isConfirmOpen: boolean;
  setConfirmOpen: (isOpen: boolean) => void;
  
  detailTarget: { q: Quadrant; i: number } | null;
  setDetailTarget: (target: { q: Quadrant; i: number } | null) => void;
  
  modalOpen: boolean;
  setModalOpen: (isOpen: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: "today",
  setActiveTab: (activeTab) => set({ activeTab }),

  selectedDate: new Date(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  timeFilter: "all",
  setTimeFilter: (timeFilter) => set({ timeFilter }),

  isProfileOpen: false,
  setProfileOpen: (isProfileOpen) => set({ isProfileOpen }),

  editHabitTarget: null,
  setEditHabitTarget: (editHabitTarget) => set({ editHabitTarget }),

  isConfirmOpen: false,
  setConfirmOpen: (isConfirmOpen) => set({ isConfirmOpen }),
  
  detailTarget: null,
  setDetailTarget: (detailTarget) => set({ detailTarget }),
  
  modalOpen: false,
  setModalOpen: (modalOpen) => set({ modalOpen }),
}));
