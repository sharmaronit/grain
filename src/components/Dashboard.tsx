import { HabitCard } from "./HabitCard";
import { SheetShell } from "./SheetShell";
import { SettingsToggle as Toggle } from "./settings/SettingsToggle";
import { FeedbackToast } from "./ui/FeedbackToast";
import { HabitActions } from "../lib/habit-actions-bridge";
import { wallpaperSevenDays } from "../lib/wallpaper-seven-days";
import { AccentPalette } from "./wallpaper/AccentPalette";
import { GrainState } from "./ui/GrainState";
import { HabitCategoryDraftPicker, HabitCategoryPicker } from "./ui/HabitCategoryPicker";
import { dismissTopOverlay, registerOverlayDismissal, requestOverlayClose } from "../lib/overlay-dismissal";
import { useSheetDismiss } from "../hooks/useSheetMotion";
import { BottomNavigation } from "./BottomNavigation";
import { DropdownMotion } from "./ui/DropdownMotion";
import { CollapseMotion } from "./ui/CollapseMotion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  memo,
  lazy,
  Suspense,
} from "react";
import {
  Flame,
  Settings,
  Plus,
  Pin,
  MoreVertical,
  Check,
  Wifi,
  ChevronDown,
  Sparkles,
  Zap,
  Clock,
  Trash2,
  X,
  Sun,
  Moon,
  RotateCcw,
  Loader2,
  ArrowRight,
  Sunrise,
  Bell,
  Download,
  Share2,
  Droplets,
  Minus,
  Shield,
  Snowflake,
  CalendarDays,
  LayoutGrid,
  Plane,
  Flashlight,
  Camera,
  LogOut,
  AlertCircle,
  WifiOff,
  User,
  GripVertical,
  MessageSquare,
  MessageSquareHeart,
  Hexagon,
  ArrowUpRight,
  Eye,
  ImagePlus,
  Move,
  Infinity,
} from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { downloadBackup, exportImage, shareNativeImage } from "../lib/backup-download";
import { summarizeConsistency } from "../lib/consistency-summary";
import { StatusBar, Style } from "@capacitor/status-bar";

// ── Firebase auth & data hooks ───────────────────────────
import {
  useAuth,
  signInEmail,
  signUpEmail,
  signInGoogle,
  signOut,
  resetPassword,
  friendlyError,
} from "../lib/auth";
import {
  scheduleHabitReminders,
  sendTestNotification,
  requestNotificationPermission,
  initNotificationChannels,
} from "../lib/reminders";
import { useHabits } from "../hooks/useHabits";
import { useCompletions } from "../hooks/useCompletions";
import { useHeatmap } from "../hooks/useHeatmap";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { usePageVisible } from "../hooks/usePageVisible";
import {
  updateUserProfile,
  getUserProfile,
  type HabitDoc,
  type Quadrant,
  type UserProfile,
} from "../lib/firestore";
import {
  formatDateKey,
  parseDateKey,
  getWeekDates,
  isSameDay,
  shortDay,
  todayKey,
  heatmapStartDate,
  isoDow,
  isScheduledDay,
} from "../lib/dates";
import { calculateStreak, calculateBestStreak, type CompletionsMap } from "../lib/streaks";

// ── Podium Features Modules ─────────────────────────────
import { HABIT_PACKS, type HabitPack } from "../lib/templates";
import { computeWeeklyInsights } from "../lib/insights";
import { computeMilestones } from "../lib/badges";
import { InsightsCard } from "../components/InsightsCard";
import { TodayHero } from "../components/TodayHero";
import { useExternalHabits } from "../hooks/useExternalHabits";
import { WidgetSettings } from "./settings/WidgetSettings";
import { useWallpaperSync } from "../hooks/useWallpaperSync";
import { useGoals } from "../hooks/useGoals";
import { deleteGoal } from "../lib/firestore";
import { Target } from "lucide-react";
import { useStore } from "../store/useStore";
import { TIME_TABS, HABIT_SETS } from "../lib/constants";
import {
  WALLPAPER_THEMES,
  resolveThemeKey,
  wallpaperThemeOf,
  gridColorOf,
  wallpaperTokens,
  type WpTokens,
} from "../lib/theme";

import type { AppTab, Theme, WallpaperState, Habit } from "../components/types";
import { useToast } from "./ui/Toast";
import { WheelPicker } from "./ui/WheelPicker";
import { DataStatusBanner } from "./ui/DataStatusBanner";
import { BackupReminderBanner } from "./ui/BackupReminderBanner";
import { WallpaperEditorControls } from "./wallpaper/WallpaperEditorControls";
import {
  clearLocalCompletionDate,
  completeLocalOnboarding,
  readLocalData,
  exportLocalBackup,
  getLocalBackupStatus,
  importLocalBackup,
  markLocalBackupExported,
  dismissLocalBackupReminder,
  migrateCloudDataToLocalOnce,
  updateLocalPrefs,
} from "../lib/local-data";

const ConsistencyTab = lazy(() =>
  import("../components/tabs/ConsistencyTab").then((m) => ({ default: m.ConsistencyTab })),
);
const GoalTab = lazy(() =>
  import("../components/tabs/GoalTab").then((m) => ({ default: m.GoalTab })),
);
const loadSwipeModeView = () =>
  import("./SwipeModeView").then((m) => ({ default: m.SwipeModeView }));
const SwipeModeView = lazy(loadSwipeModeView);
const OnboardingModal = lazy(() =>
  import("./OnboardingModal").then((m) => ({ default: m.OnboardingModal })),
);
const WeeklyReviewModal = lazy(() =>
  import("./WeeklyReviewModal").then((m) => ({ default: m.WeeklyReviewModal })),
);
const FeedbackSheet = lazy(() =>
  import("./modals/FeedbackSheet").then((m) => ({ default: m.FeedbackSheet })),
);
const BadgesModal = lazy(() =>
  import("../components/BadgesModal").then((m) => ({ default: m.BadgesModal })),
);
const InsightsCoachModal = lazy(() =>
  import("../components/InsightsCoachModal").then((m) => ({ default: m.InsightsCoachModal })),
);
const ShareStreakModal = lazy(() =>
  import("../components/ShareStreakModal").then((m) => ({ default: m.ShareStreakModal })),
);

const catClass = (_c: string) => "bg-canvas-soft text-body border border-[color:var(--hairline)]";

const QUADRANTS: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do first", sub: "Urgent · Important" },
  q2: { title: "Schedule", sub: "Important · Not urgent" },
  q3: { title: "Delegate", sub: "Urgent · Low impact" },
  q4: { title: "Don't do", sub: "Low · Not urgent" },
};

const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];
const TIME_ORDER = ["morning", "afternoon", "evening", "any"] as const;
const TAB_ORDER: AppTab[] = ["today", "consistency", "myday", "goal"];

const DeferredTabFallback = () => (
  <div className="flex h-full items-center justify-center gap-2 text-sm text-mute">
    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
  </div>
);

const INITIAL_HABITS: Record<Quadrant, Habit[]> = {
  q1: [],
  q2: [],
  q3: [],
  q4: [],
};

const CATEGORIES = ["All habits", "Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];

function generateHeatmap(): number[][] {
  const cells: number[][] = [];
  for (let w = 0; w < 52; w++) {
    cells.push([0, 0, 0, 0, 0, 0, 0]);
  }
  return cells;
}

function needsOnboarding(userId: string | null, storageKey: string) {
  try {
    return !!userId && !!storageKey && !localStorage.getItem(storageKey) && !readLocalData(userId).prefs.onboardingCompleted;
  } catch { return false; }
}

function safeBackupStatus(userId: string | null) {
  try { return userId ? getLocalBackupStatus(userId) : null; }
  catch { return null; }
}

export function Dashboard({ user }: { user?: any }) {
  const pageVisible = usePageVisible();
  const [showStaticTargetSelector, setShowStaticTargetSelector] = useState(false);

  const userId = user?.uid ?? null;
  const onboardingStorageKey = userId ? `grain_onboarded_${userId}` : "";
  const online = useOnlineStatus();

  useEffect(() => {
    if (!userId || !online) return;
    void migrateCloudDataToLocalOnce(userId).then((migrated) => {
      if (migrated) showToast("Existing data moved to this device");
    });
  }, [online, userId]);

  // The Deck is a primary navigation destination. Fetch its split chunk while
  // the startup splash is still visible so opening it never waits on a download.
  useEffect(() => {
    void loadSwipeModeView();
  }, []);

  const [dateStyle, setDateStyle] = useState<"underline" | "block" | "mono">(() => {
    try {
      const saved = localStorage.getItem("grain_date_selector_style");
      if (saved === "underline" || saved === "block" || saved === "mono") return saved;
    } catch {}
    return "underline";
  });
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // This is a visual preference, so retain it between Dashboard remounts and app launches.
  useEffect(() => {
    try {
      localStorage.setItem("grain_date_selector_style", dateStyle);
    } catch {}
  }, [dateStyle]);

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("grain_active_tab");
        if (saved && ["today", "consistency", "myday", "goal"].includes(saved)) {
          return saved as AppTab;
        }
      } catch {}
    }
    return "today";
  });
  const [tabHistory, setTabHistory] = useState<AppTab[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("grain_active_tab");
        if (saved && ["today", "consistency", "myday", "goal"].includes(saved)) {
          return [saved as AppTab];
        }
      } catch {}
    }
    return ["today"];
  });
  const lastBackPressRef = useRef<number>(0);

  const [wallpaperEditorOpen, setWallpaperEditorOpen] = useState(false);
  const [tabDirection, setTabDirection] = useState<"left" | "right">("left");
  const [swipeMode, setSwipeMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const tabTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const switchTab = useCallback(
    (tab: AppTab, pushHistory: boolean = true) => {
      if (activeTab === tab) return;
      const currentIdx = TAB_ORDER.indexOf(activeTab);
      const nextIdx = TAB_ORDER.indexOf(tab);
      setTabDirection(nextIdx >= currentIdx ? "left" : "right");
      startTransition(() => {
        setActiveTab(tab);
      });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("grain_active_tab", tab);
        } catch {}
      }

      if (pushHistory) {
        setTabHistory((prev) => (prev[prev.length - 1] === tab ? prev : [...prev, tab]));
      }
    },
    [activeTab],
  );
  const openDeck = useCallback(() => setSwipeMode(true), []);

  const { goals, error: goalsError, retry: retryGoals } = useGoals(userId);
  const activeGoalId = useStore((s) => s.activeGoalId);
  const setActiveGoalId = useStore((s) => s.setActiveGoalId);

  const [selectedHabit, setSelectedHabit] = useState("All habits");
  const [myDayOverrideId, setMyDayOverrideId] = useState<string | null>(null);
  const [myDayCompletedOpen, setMyDayCompletedOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreatingHabit, setIsCreatingHabit] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    return (
      typeof window !== "undefined" &&
      needsOnboarding(userId, onboardingStorageKey)
    );
  });

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      needsOnboarding(userId, onboardingStorageKey)
    ) {
      setOnboardingOpen(true);
    }
  }, [onboardingStorageKey, userId]);
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const [activeSettingTab, setActiveSettingTab] = useState<
    "theme" | "style" | "color" | "habits" | "stats"
  >("theme");
  const [applyMenuOpen, setApplyMenuOpen] = useState(false);
  const toolbarDragStartY = useRef<number | null>(null);
  const [wallpaperSync, setWallpaperSync] = useState(true);
  const [exactAlarmAllowed, setExactAlarmAllowed] = useState<boolean | null>(null);
  const [wallpaperState, setWallpaperState] = useState<WallpaperState>("idle");
  const [wallpaperSnapshot, setWallpaperSnapshot] = useState<number[][] | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>("q2");
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("grain_app_theme");
        if (saved && ["dark", "amoled", "light"].includes(saved)) {
          return saved as Theme;
        }
      } catch {}
    }
    return "dark";
  });

  const {
    toast: globalToast,
    error: toastError,
    success: toastSuccess,
    toasts,
    removeToast,
  } = useToast();
  const activeToast = toasts[toasts.length - 1];

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !userId) return;
    let removed = false;
    const openRequestedHabit = async () => {
      const request = await HabitActions.consumeCreateHabitRequest();
      if (removed || !request.open || (request.userId && request.userId !== userId)) return;
      switchTab("today", false);
      setSettingsOpen(false);
      setOnboardingOpen(false);
      setDrawerOpen(false);
      setSwipeMode(false);
      setModalOpen(true);
    };
    const listener = HabitActions.addListener("createHabitRequested", () => {
      void openRequestedHabit();
    });
    void listener.then(() => openRequestedHabit());
    return () => {
      removed = true;
      void listener.then((handle) => handle.remove());
    };
  }, [userId, switchTab]);

  // Multi-select & Bulk Delete state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const toggleSelectHabit = (habitId: string) => {
    setSelectedHabitIds((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
        if (next.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const handleHabitLongPress = (habitId: string) => {
    setIsSelectionMode(true);
    setSelectedHabitIds((prev) => {
      const next = new Set(prev);
      next.add(habitId);
      return next;
    });
  };

  // ── Real Firebase Hooks ─────────────────────────────────
  const {
    habits: rawHabits,
    byQuadrant: habitsByQ,
    loading: habitsLoading,
    error: habitsError,
    retry: retryHabits,
    add: addHabit,
    update: updateHabitDoc,
    remove: removeHabitDoc,
    removeMany: removeManyHabits,
    restore: restoreHabitDoc,
  } = useHabits(userId);

  const {
    entries: completions,
    loading: completionsLoading,
    error: completionsError,
    retry: retryCompletions,
    toggleDone: toggleHabitDone,
    setValue: setHabitValue,
    adjustValue: adjustHabitValue,
    setRestDay: setHabitRestDay,
    markSkipped: markHabitSkipped,
    freezeStreak: freezeHabitStreak,
    saveNote: saveHabitNote,
  } = useCompletions(userId, selectedDate);

  const {
    grid: heatmapGrid,
    todayCol,
    todayRow,
    stats: heatmapStats,
    habitStreaks,
    completionsMap,
    loading: heatmapLoading,
    error: heatmapError,
    retry: retryHeatmap,
  } = useHeatmap(userId, rawHabits);
  const consistencySummary = useMemo(
    () => summarizeConsistency(rawHabits, completionsMap, selectedHabit, selectedDate),
    [rawHabits, completionsMap, selectedHabit, selectedDate, heatmapStats.currentStreak],
  );

  const dataError = habitsError || completionsError || heatmapError || goalsError;
  const [backupStatus, setBackupStatus] = useState(() => safeBackupStatus(userId));
  const hasFirstCompletion = useMemo(
    () => Object.values(completionsMap).some((day) => Object.values(day).some((entry) => entry.done)),
    [completionsMap],
  );

  useEffect(() => {
    setBackupStatus(safeBackupStatus(userId));
  }, [userId, rawHabits.length, goals.length, heatmapStats.totalCompletions]);

  const retryData = useCallback(() => {
    retryHabits();
    retryCompletions();
    retryHeatmap();
    retryGoals();
  }, [retryCompletions, retryGoals, retryHabits, retryHeatmap]);

  // Derived heatmap state for UI compatibility
  const heatmap = heatmapGrid;

  const [syncPulse, setSyncPulse] = useState(0);
  const [throttled, setThrottled] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"all" | "morning" | "afternoon" | "evening">("all");
  const [wallpaperTheme, setWallpaperTheme] = useState<string>("auto");

  // Dynamically set status bar style based on theme
  useEffect(() => {
    const applyStatusBarStyle = async () => {
      try {
        const wt = wallpaperThemeOf(wallpaperTheme, theme);
        // If the theme background is bright, we want dark icons (Style.Light).
        // If it's dark, we want light icons (Style.Dark).
        const isBright = wt.bg === "#f5f5f5" || (wt.bg as string) === "#ffffff";
        await StatusBar.setStyle({ style: isBright ? Style.Light : Style.Dark });
      } catch (e) {
        // Ignored on web
      }
    };
    applyStatusBarStyle();
  }, [wallpaperTheme]);
  const [gridColorTheme, setGridColorTheme] = useState<string>("emerald");
  const [wallpaperHabitSet, setWallpaperHabitSet] = useState<string>("none");
  const [wallpaperGridStyle, setWallpaperGridStyle] = useState<
    "weeks" | "year" | "month" | "goals" | "widget"
  >("weeks");
  const [wallpaperCustomPhoto, setWallpaperCustomPhoto] = useState<string | null>(null);
  const [wallpaperPhotoOverlay, setWallpaperPhotoOverlay] = useState<number>(0.4);
  const [wallpaperStatsAlign, setWallpaperStatsAlign] = useState<"left" | "center" | "right">(
    "center",
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const wallpaperGridRef = useRef<HTMLDivElement>(null);
  const wallpaperPhotoRef = useRef<HTMLImageElement>(null);
  const [wallpaperOffset, setWallpaperOffset] = useState({ x: 0, y: 0 });
  const [wallpaperPhotoOffset, setWallpaperPhotoOffset] = useState({ x: 0, y: 0 });
  const [wallpaperPhotoScale, setWallpaperPhotoScale] = useState(1);
  const [isMovingPhoto, setIsMovingPhoto] = useState(false);
  const [isRepositionMode, setIsRepositionMode] = useState(false);
  const [wallpaperActionMenuOpen, setWallpaperActionMenuOpen] = useState(false);
  const [wallpaperMenuExpanded, setWallpaperMenuExpanded] = useState(false);
  const [showGridGestureHint, setShowGridGestureHint] = useState(() => {
    try {
      return localStorage.getItem("grain_grid_gesture_learned") !== "true";
    } catch {
      return true;
    }
  });
  const [isDraggingWallpaper, setIsDraggingWallpaper] = useState(false);
  const [wallpaperScale, setWallpaperScale] = useState(1);
  const [appliedWallpaper, setAppliedWallpaper] = useState<{
    theme: string;
    gridColorTheme: string;
    wallpaperHabitSet: string;
    wallpaperGridStyle: "weeks" | "year" | "month" | "goals" | "widget";
    wallpaperCustomPhoto: string | null;
    wallpaperPhotoOverlay: number;
    wallpaperStatsAlign: "left" | "center" | "right";
    wallpaperOffset: { x: number; y: number };
    wallpaperPhotoOffset: { x: number; y: number };
    wallpaperPhotoScale: number;
    wallpaperScale: number;
    previewWeeks: number;
  }>({
    theme: "auto",
    gridColorTheme: "emerald",
    wallpaperHabitSet: "none",
    wallpaperGridStyle: "weeks",
    wallpaperCustomPhoto: null,
    wallpaperPhotoOverlay: 0.4,
    wallpaperStatsAlign: "center",
    wallpaperOffset: { x: 0, y: 0 },
    wallpaperPhotoOffset: { x: 0, y: 0 },
    wallpaperPhotoScale: 1,
    wallpaperScale: 1,
    previewWeeks: 26,
  });
  const [remindersOn, setRemindersOn] = useState(() => Capacitor.isNativePlatform());
  const [reminderTime, setReminderTime] = useState<string>("20:00");
  const [morningKickoff, setMorningKickoff] = useState<boolean>(false);
  const [dailySummary, setDailySummary] = useState(false);
  useExternalHabits(userId, theme, remindersOn, reminderTime, dailySummary, morningKickoff);

  useEffect(() => {
    initNotificationChannels();
  }, []);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (detailId) setNoteDraft(completions[detailId]?.note ?? "");
  }, [detailId]);

  const [wallpaperPreview, setWallpaperPreview] = useState(false);
  const [captureBusy, setCaptureBusy] = useState<null | "share" | "save">(null);
  const [previewWeeks, setPreviewWeeks] = useState(26);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [editHabitTarget, setEditHabitTarget] = useState<{ q: Quadrant; i: number } | null>(null);

  // ── Podium Feature Modal States ───────────────────────
  const [aiCoachOpen, setAiCoachOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [shareStreakOpen, setShareStreakOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Compute 28-day weekly insights
  const weeklyInsights = useMemo(
    () => computeWeeklyInsights(rawHabits, completionsMap, habitStreaks),
    [rawHabits, completionsMap, habitStreaks],
  );

  useEffect(() => {
    const handleBackButton = () => {
      try {
        navigator.vibrate?.(10);
      } catch {}

      // 1. Check Modals, Sheets & Overlays in order of precedence
      if (showStaticTargetSelector && dismissTopOverlay()) return;
      if (applyMenuOpen) {
        setApplyMenuOpen(false);
        return;
      }
      if (wallpaperEditorOpen) {
        setWallpaperEditorOpen(false);
        return;
      }
      if (bulkDeleteConfirmOpen) {
        setBulkDeleteConfirmOpen(false);
        return;
      }
      if (signOutOpen) {
        setSignOutOpen(false);
        return;
      }
      if (resetConfirmOpen) {
        setResetConfirmOpen(false);
        return;
      }
      if (dismissTopOverlay()) return;
      if (profileEditOpen) {
        setProfileEditOpen(false);
        return;
      }
      if (feedbackOpen) {
        setFeedbackOpen(false);
        return;
      }
      if (editHabitTarget) {
        setEditHabitTarget(null);
        return;
      }
      if (detail) {
        setDetail(null);
        return;
      }
      if (aiCoachOpen) {
        setAiCoachOpen(false);
        return;
      }
      if (badgesOpen) {
        setBadgesOpen(false);
        return;
      }
      if (shareStreakOpen) {
        setShareStreakOpen(false);
        return;
      }
      if (streakOpen) {
        setStreakOpen(false);
        return;
      }
      if (previewModalOpen) {
        setPreviewModalOpen(false);
        return;
      }
      if (wallpaperPreview) {
        setWallpaperPreview(false);
        return;
      }
      if (weeklyReviewOpen) {
        setWeeklyReviewOpen(false);
        return;
      }
      if (dateDropdownOpen) {
        setDateDropdownOpen(false);
        return;
      }
      if (filterOpen) {
        setFilterOpen(false);
        return;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        return;
      }
      if (modalOpen) {
        setModalOpen(false);
        return;
      } // Add Habit modal
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedHabitIds(new Set());
        return;
      }
      if (swipeMode) {
        setSwipeMode(false);
        return;
      }

      // 2. Check Tab History (Navigate back to previously visited tab)
      if (tabHistory.length > 1) {
        const nextHistory = [...tabHistory];
        nextHistory.pop(); // remove current active tab
        const prevTab = nextHistory[nextHistory.length - 1];
        setTabHistory(nextHistory);
        switchTab(prevTab, false);
        return;
      }

      if (activeTab !== "today") {
        setTabHistory(["today"]);
        switchTab("today", false);
        return;
      }

      // 3. Double-Back to Exit with friendly toast (Standard Android UX)
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapacitorApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        showToast("Press back again to exit");
      }
    };

    const listener = CapacitorApp.addListener("backButton", handleBackButton);
    const appStateListener = CapacitorApp.addListener("appStateChange", (state) => {
      if (!state.isActive && activeTab) {
        try {
          localStorage.setItem("grain_active_tab", activeTab);
        } catch {}
      }
    });

    return () => {
      listener.then((l: any) => l.remove());
      appStateListener.then((l: any) => l.remove());
    };
  }, [
    showStaticTargetSelector,
    applyMenuOpen,
    wallpaperEditorOpen,
    bulkDeleteConfirmOpen,
    signOutOpen,
    resetConfirmOpen,
    profileEditOpen,
    feedbackOpen,
    editHabitTarget,
    detailId,
    aiCoachOpen,
    badgesOpen,
    shareStreakOpen,
    streakOpen,
    previewModalOpen,
    wallpaperPreview,
    weeklyReviewOpen,
    dateDropdownOpen,
    filterOpen,
    drawerOpen,
    modalOpen,
    settingsOpen,
    isSelectionMode,
    swipeMode,
    tabHistory,
    activeTab,
  ]);

  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    tagline: string;
    initials: string;
  }>(() => {
    const name = user?.displayName || user?.email?.split("@")[0] || "You";
    const initials =
      name
        .split(/\s+/)
        .map((w: string) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U";
    return {
      name,
      email: user?.email || "",
      tagline: "Building the 1% better version daily.",
      initials,
    };
  });

  // Load user profile doc from Firestore on mount
  useEffect(() => {
    if (!userId) return;
    getUserProfile(userId).then((docData) => {
      if (docData) {
        setProfile({
          name: docData.name || user?.displayName || "You",
          email: docData.email || user?.email || "",
          tagline: docData.tagline || "Building the 1% better version daily.",
          initials: docData.initials || "U",
        });
        if (docData.theme) setTheme(docData.theme as Theme);
        if (typeof docData.remindersOn === "boolean") setRemindersOn(Capacitor.isNativePlatform() && docData.remindersOn);
        if (docData.reminderTime) setReminderTime(docData.reminderTime);
        if (typeof docData.morningKickoff === "boolean") setMorningKickoff(docData.morningKickoff);
        setDailySummary(docData.dailySummary ?? false);
        const prefs = (docData as any).prefs;
        if (prefs) {
          const loadedApplied = {
            theme: prefs.wallpaperTheme ?? "auto",
            gridColorTheme: prefs.gridColorTheme ?? "emerald",
            wallpaperHabitSet: prefs.wallpaperHabitSet ?? "none",
            wallpaperGridStyle: prefs.wallpaperGridStyle === "widget" ? "weeks" : (prefs.wallpaperGridStyle as any) ?? "weeks",
            wallpaperCustomPhoto: prefs.wallpaperCustomPhoto ?? null,
            wallpaperPhotoOverlay:
              typeof prefs.wallpaperPhotoOverlay === "number" ? prefs.wallpaperPhotoOverlay : 0.4,
            wallpaperStatsAlign: prefs.wallpaperStatsAlign ?? "center",
            wallpaperOffset: prefs.wallpaperOffset ?? { x: 0, y: 0 },
            wallpaperPhotoOffset: prefs.wallpaperPhotoOffset ?? { x: 0, y: 0 },
            wallpaperPhotoScale:
              typeof prefs.wallpaperPhotoScale === "number" ? prefs.wallpaperPhotoScale : 1,
            wallpaperScale: typeof prefs.wallpaperScale === "number" ? prefs.wallpaperScale : 1,
            previewWeeks: typeof prefs.previewWeeks === "number" ? prefs.previewWeeks : 26,
          };
          setAppliedWallpaper(loadedApplied);

          setWallpaperTheme(loadedApplied.theme);
          setGridColorTheme(loadedApplied.gridColorTheme);
          setWallpaperHabitSet(loadedApplied.wallpaperHabitSet);
          setWallpaperGridStyle(loadedApplied.wallpaperGridStyle);
          if (prefs.activeGoalId) setActiveGoalId(prefs.activeGoalId);
          if (prefs.wallpaperOffset) {
            setWallpaperOffset(prefs.wallpaperOffset);
          }
          if (typeof prefs.wallpaperScale === "number") {
            setWallpaperScale(prefs.wallpaperScale);
          }
          if (prefs.wallpaperPhotoOffset) {
            setWallpaperPhotoOffset(prefs.wallpaperPhotoOffset);
          }
          if (typeof prefs.wallpaperPhotoScale === "number") {
            setWallpaperPhotoScale(prefs.wallpaperPhotoScale);
          }
          if (prefs.wallpaperCustomPhoto) {
            setWallpaperCustomPhoto(prefs.wallpaperCustomPhoto);
          }
          if (typeof prefs.wallpaperPhotoOverlay === "number") {
            setWallpaperPhotoOverlay(prefs.wallpaperPhotoOverlay);
          }
          if (prefs.wallpaperStatsAlign) {
            setWallpaperStatsAlign(prefs.wallpaperStatsAlign);
          }
          if (typeof prefs.wallpaperSync === "boolean") setWallpaperSync(prefs.wallpaperSync);
          if (typeof docData.remindersOn !== "boolean" && typeof prefs.remindersOn === "boolean")
            setRemindersOn(Capacitor.isNativePlatform() && prefs.remindersOn);
          if (!docData.reminderTime && prefs.reminderTime) setReminderTime(prefs.reminderTime);
          if (typeof docData.morningKickoff !== "boolean" && typeof prefs.morningKickoff === "boolean") setMorningKickoff(prefs.morningKickoff);
          if (typeof prefs.previewWeeks === "number") setPreviewWeeks(prefs.previewWeeks);
          if (prefs.timeFilter) setTimeFilter(prefs.timeFilter);
          if (prefs.theme) setTheme(prefs.theme as Theme);
        }
      }
    }).catch(() => { /* Data hooks show the recovery banner without replacing stored data. */ });
  }, [userId, user]);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heatmapRef = useRef<HTMLDivElement | null>(null);
  const heatmapVisibleRef = useRef(false);
  const scrollingRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);

  // Combine scroll + heatmap-in-view signals into a single throttle flag.
  useEffect(() => {
    const recompute = () => {
      setThrottled(scrollingRef.current || heatmapVisibleRef.current);
    };

    const el = scrollRef.current;
    const onScroll = () => {
      if (!scrollingRef.current) {
        scrollingRef.current = true;
        recompute();
      }
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        scrollingRef.current = false;
        recompute();
      }, 180);
    };
    el?.addEventListener("scroll", onScroll, { passive: true });

    let io: IntersectionObserver | null = null;
    if (heatmapRef.current) {
      io = new IntersectionObserver(
        (entries) => {
          heatmapVisibleRef.current = entries[0]?.isIntersecting ?? false;
          recompute();
        },
        { root: el ?? null, threshold: 0.15 },
      );
      io.observe(heatmapRef.current);
    }

    return () => {
      el?.removeEventListener("scroll", onScroll);
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
      io?.disconnect();
    };
  }, []);

  // Form state for habit creation
  const [newName, setNewName] = useState("");
  const [newFreq, setNewFreq] = useState("Daily");
  const [newCustomDays, setNewCustomDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [newShade, setNewShade] = useState(0);
  const [newIcon, setNewIcon] = useState(0);
  const newCategory = useRef("Mind");
  const [newTime, setNewTime] = useState<Habit["time"] | undefined>(undefined);
  const [newIsNumeric, setNewIsNumeric] = useState(false);
  const [newTarget, setNewTarget] = useState<number>(1);
  const [newUnit, setNewUnit] = useState<string>("");
  const [showCustomize, setShowCustomize] = useState(false);

  const week = ["S", "M", "T", "W", "T", "F", "S"];

  // Merge Firestore habit definitions with today's completion status
  const habits = useMemo(() => {
    const map: Record<Quadrant, Habit[]> = { q1: [], q2: [], q3: [], q4: [] };
    for (const q of QUADRANT_ORDER) {
      map[q] = (habitsByQ[q] ?? []).map((h) => {
        const entry = completions[h.id];
        const hStats = habitStreaks[h.id];
        return {
          ...h,
          done: entry?.done ?? false,
          skipped: entry?.skipped ?? false,
          value: entry?.value ?? 0,
          note: entry?.note ?? "",
          streak: hStats?.currentStreak ?? 0,
          best: Math.max(h.bestStreak ?? 0, hStats?.bestStreak ?? 0),
        };
      });
    }
    return map;
  }, [habitsByQ, completions, habitStreaks]);

  const flatHabits = useMemo(() => Object.values(habits).flat(), [habits]);
  // Pinning and moving can reorder a quadrant while the sheet is open.
  // Keep the identity stable and resolve its current position each render.
  const detail = useMemo(() => {
    for (const q of QUADRANT_ORDER) {
      const i = habits[q].findIndex((habit) => habit.id === detailId);
      if (i !== -1) return { q, i };
    }
    return null;
  }, [habits, detailId]);
  const setDetail = (target: { q: Quadrant; i: number } | null) =>
    setDetailId(target ? habits[target.q][target.i]?.id ?? null : null);

  const scheduledHabits = useMemo(() => {
    return flatHabits.filter((h) => isScheduledDay(h.frequency, h.customDays, selectedDate));
  }, [flatHabits, selectedDate]);

  const scheduledHabitsByQuadrant = useMemo(() => {
    const result: Record<Quadrant, Array<{ habit: Habit; index: number }>> = {
      q1: [],
      q2: [],
      q3: [],
      q4: [],
    };
    for (const q of QUADRANT_ORDER) {
      result[q] = habits[q]
        .map((habit, index) => ({ habit, index }))
        .filter(({ habit }) => isScheduledDay(habit.frequency, habit.customDays, selectedDate));
    }
    return result;
  }, [habits, selectedDate]);

  const doneCount = scheduledHabits.filter(
    (h) => completions[h.id]?.done || completions[h.id]?.restDay,
  ).length;
  const totalCount = scheduledHabits.length;
  const totalStreak = heatmapStats.currentStreak;
  const rate = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  // Liquid-glass ripple + subtle haptic tap on any button/chip.
  useEffect(() => {
    const root = scrollRef.current?.parentElement ?? document.body;
    const onDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        '[class*="btn-"], [class*="chip-"], [data-lg-press]',
      );
      if (!target) return;
      if (target.hasAttribute("disabled")) return;
      try {
        navigator.vibrate?.(18);
      } catch {}

      const cs = getComputedStyle(target);
      if (cs.position === "static") target.style.position = "relative";
      if (cs.overflow === "visible") target.style.overflow = "hidden";
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const span = document.createElement("span");
      span.className = "lg-ripple";
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left}px`;
      span.style.top = `${e.clientY - rect.top}px`;
      target.appendChild(span);
      window.setTimeout(() => span.remove(), 700);
    };
    root.addEventListener("pointerdown", onDown);
    return () => root.removeEventListener("pointerdown", onDown);
  }, []);

  const showToast = (
    msg: string,
    action?: { label: string; onClick: () => void },
    duration = 1600,
  ) => {
    globalToast(msg, "info", action, duration);
  };

  const completeHabit = async (targetHabit: Habit) => {
    const wasDone = targetHabit.done;
    if (!wasDone) {
      try {
        navigator.vibrate?.([14, 40, 22]);
      } catch {}
    }
    if (targetHabit.type === "numeric" && targetHabit.target != null) {
      await setHabitValue(targetHabit.id, wasDone ? 0 : targetHabit.target, targetHabit.target);
    } else {
      await toggleHabitDone(targetHabit.id);
    }
    if (!wasDone) globalToast(`Completed ${targetHabit.name}`, "success", undefined, 3000);
  };

  const toggleDone = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (targetHabit) await completeHabit(targetHabit);
  };

  const restHabit = async (q: Quadrant, i: number) => {
    const target = habits[q][i];
    if (!target || target.done) return;
    try {
      navigator.vibrate?.(10);
    } catch {}
    await setHabitRestDay(target.id);
    showToast(`Rest day · "${target.name}" streak preserved`);
  };

  const adjustValue = async (q: Quadrant, i: number, dir: 1 | -1) => {
    const targetHabit = habits[q][i];
    if (!targetHabit || targetHabit.target === null || targetHabit.target === undefined) return;
    const step = targetHabit.step ?? 0.25;
    await adjustHabitValue(targetHabit.id, dir, step, targetHabit.target);
    if (dir === 1 && !targetHabit.done && (targetHabit.value ?? 0) + step >= targetHabit.target) {
      globalToast(`Completed ${targetHabit.name}`, "success", undefined, 3000);
    }
  };

  const freezeStreak = (q: Quadrant, i: number) => {
    try {
      const targetHabit = habits[q][i];
      if (!targetHabit) return;
      freezeHabitStreak(targetHabit.id).catch((err) => toastError("Freeze error"));
      showToast(`Streak frozen for "${targetHabit.name}"`);
    } finally {
      setDetail(null);
    }
  };

  const togglePin = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    await updateHabitDoc(targetHabit.id, { pinned: !targetHabit.pinned });
    showToast(
      !targetHabit.pinned ? `Pinned "${targetHabit.name}"` : `Unpinned "${targetHabit.name}"`,
    );
  };

  const deleteHabit = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    try {
      navigator.vibrate?.([28, 60, 40]);
    } catch {}
    const removed = await removeHabitDoc(targetHabit.id);
    if (!removed) return;
    showToast(
      `Deleted "${removed.name}"`,
      {
        label: "Undo",
        onClick: () => {
          try {
            navigator.vibrate?.(10);
          } catch {}
          restoreHabitDoc(removed);
          showToast(`Restored "${removed.name}"`);
        },
      },
      6000,
    );
  };

  const moveHabit = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    const currentIdx = QUADRANT_ORDER.indexOf(q);
    const targetQ = QUADRANT_ORDER[(currentIdx + 1) % 4];
    await updateHabitDoc(targetHabit.id, { quadrant: targetQ });
    showToast(`Moved to "${QUADRANTS[targetQ].title}"`);
  };

  const resetCreatedDraft = useRef(false);
  const closeCreateHabit = useCallback(() => {
    setModalOpen(false);
    if (!resetCreatedDraft.current) return;
    resetCreatedDraft.current = false;
    setNewName("");
    newCategory.current = "Mind";
    setNewFreq("Daily");
    setNewCustomDays([0, 1, 2, 3, 4]);
    setNewShade(0);
    setNewIcon(0);
    setNewTime(undefined);
    setNewIsNumeric(false);
    setNewTarget(1);
    setNewUnit("");
  }, []);
  const dismissCreateHabit = useSheetDismiss(closeCreateHabit);
  const closeProfileEdit = useCallback(() => setProfileEditOpen(false), []);
  const closeEditHabit = useCallback(() => setEditHabitTarget(null), [setEditHabitTarget]);
  const closeWallpaperTarget = useCallback(() => setShowStaticTargetSelector(false), []);
  const closeHabitDetail = useCallback(() => setDetail(null), []);
  const closeStreak = useCallback(() => setStreakOpen(false), []);
  const openStreak = useCallback(() => setStreakOpen(true), []);

  const createHabit = async () => {
    const name = newName.trim();
    if (!name || isCreatingHabit) {
      showToast("Please enter a name for your habit");
      return;
    }
    const freq = newFreq === "Weekdays" ? "weekdays" : newFreq === "Custom" ? "custom" : "daily";
    if (newIsNumeric && (!Number.isFinite(newTarget) || newTarget <= 0)) {
      showToast("Choose a target greater than zero");
      return;
    }
    if (freq === "custom" && newCustomDays.length === 0) {
      showToast("Choose at least one repeat day");
      return;
    }

    const habitData = {
      name,
      category: newCategory.current,
      quadrant: selectedQuadrant,
      time: newTime ?? null,
      type: newIsNumeric ? "numeric" : "binary",
      target: newIsNumeric ? newTarget || 1 : null,
      unit: newIsNumeric ? newUnit || null : null,
      step: newIsNumeric ? 0.25 : null,
      pinned: false,
      frequency: freq,
      customDays: freq === "custom" ? newCustomDays : [],
      icon: newIcon,
      shade: newShade,
      bestStreak: 0,
      order: flatHabits.length > 0 ? Math.min(...flatHabits.map((h) => h.order)) - 1 : 0,
    };

    setIsCreatingHabit(true);
    try {
      await addHabit(habitData as any);
      if (needsOnboarding(userId, onboardingStorageKey) && userId) {
        updateLocalPrefs(userId, { onboardingCompleted: true });
        localStorage.setItem(onboardingStorageKey, "true");
      }
      resetCreatedDraft.current = true;
      dismissCreateHabit();
      showToast(`Saved "${name}" on this device`);
    } catch {
      globalToast(
        "Habit was not saved on this device.",
        "error",
        { label: "Try again", onClick: () => void createHabit() },
        6000,
      );
    } finally {
      setIsCreatingHabit(false);
    }
  };

  const toggleWallpaperSync = () => {
    setWallpaperSync((v) => {
      const next = !v;
      if (next) {
        setSyncPulse((n) => n + 1);
        showToast("Live sync on");
      } else {
        // freeze snapshot
        setWallpaperSnapshot(heatmap.map((c) => c.slice()));
        showToast("Live sync paused");
      }
      return next;
    });
  };

  useEffect(() => {
    if (!settingsOpen || !Capacitor.isNativePlatform()) return;
    let cancelled = false;
    import("../lib/wallpaper-bridge")
      .then(({ WallpaperNative }) => WallpaperNative.isExactAlarmAllowed())
      .then(({ allowed }) => {
        if (!cancelled) setExactAlarmAllowed(allowed);
      })
      .catch(() => {
        if (!cancelled) setExactAlarmAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settingsOpen]);

  const requestExactAlarmPermission = async () => {
    try {
      const { WallpaperNative } = await import("../lib/wallpaper-bridge");
      await WallpaperNative.requestExactAlarmPermission();
      showToast("Allow Alarms & reminders, then return to Grain");
      window.setTimeout(async () => {
        const { allowed } = await WallpaperNative.isExactAlarmAllowed();
        setExactAlarmAllowed(allowed);
      }, 700);
    } catch {
      toastError("Could not open Android alarm settings");
    }
  };

  const displayedHeatmap = useMemo(() => {
    const baseHeatmap = wallpaperSync ? heatmap : (wallpaperSnapshot ?? heatmap);
    if (activeGoalId && wallpaperHabitSet === "none") {
      const goal = goals.find((g) => g.id === activeGoalId);
      if (goal && goal.startDate && goal.targetDate) {
        const start = parseDateKey(goal.startDate);
        const target = parseDateKey(goal.targetDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Heatmap start date aligned to Monday of 52 weeks ago
        const heatmapStart = heatmapStartDate(today);

        const override = Array.from({ length: 52 }, () => Array(7).fill(0));

        for (let w = 0; w < 52; w++) {
          for (let d = 0; d < 7; d++) {
            const date = new Date(heatmapStart);
            date.setDate(date.getDate() + w * 7 + d);
            date.setHours(0, 0, 0, 0);

            if (date.getTime() >= start.getTime() && date.getTime() <= target.getTime()) {
              if (date.getTime() <= today.getTime()) {
                override[w][d] = 3; // elapsed
              } else {
                override[w][d] = 1; // future
              }
            }
          }
        }
        return override;
      }
    }
    return baseHeatmap;
  }, [wallpaperSync, heatmap, wallpaperSnapshot, activeGoalId, goals, wallpaperHabitSet]);

  // Override stats pill for goals
  const activeGoal = useMemo(() => goals.find((g) => g.id === activeGoalId), [goals, activeGoalId]);
  let displayedTotalStreak = heatmapStats.currentStreak;
  let displayedRate = heatmapStats.completionRate;
  if (activeGoal && activeGoal.startDate && activeGoal.targetDate) {
    const start = parseDateKey(activeGoal.startDate);
    const target = parseDateKey(activeGoal.targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.round((target.getTime() - start.getTime()) / 86400000) + 1);
    const elapsedDays = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000) + 1);
    const daysLeft = Math.max(0, totalDays - Math.min(elapsedDays, totalDays));
    const pct = Math.round((Math.min(elapsedDays, totalDays) / totalDays) * 100);

    displayedTotalStreak = daysLeft;
    displayedRate = pct;
  }

  const stackedGoals = useMemo(() => {
    if (wallpaperGridStyle !== "goals") return [];

    // Find all goals that have target dates and are not completely in the past
    const active = goals.filter((g) => {
      if (!g.startDate || !g.targetDate) return false;
      const target = parseDateKey(g.targetDate);
      return target.getTime() >= new Date().setHours(0, 0, 0, 0);
    });

    return active.map((goal) => {
      const start = parseDateKey(goal.startDate!);
      const target = parseDateKey(goal.targetDate!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalDays = Math.max(
        1,
        Math.round((target.getTime() - start.getTime()) / 86400000) + 1,
      );
      const elapsedDays = Math.max(
        0,
        Math.round((today.getTime() - start.getTime()) / 86400000) + 1,
      );
      const daysLeft = Math.max(0, totalDays - Math.min(elapsedDays, totalDays));
      const pct = Math.round((Math.min(elapsedDays, totalDays) / totalDays) * 100);

      // Keep the entire goal journey visible. The old payload included only
      // remaining days, so a short goal rendered as a flat, indistinguishable row.
      const completedDays = Math.min(totalDays, Math.max(0, elapsedDays - 1));
      const boxes = Array.from({ length: totalDays }, (_, dayIndex) => {
        if (dayIndex < completedDays) return 2;
        if (dayIndex === completedDays && elapsedDays > 0 && elapsedDays <= totalDays) return 3;
        return 0;
      });

      return {
        id: goal.id,
        title: goal.name,
        heatmap: [],
        boxes,
        currentStreak: daysLeft,
        completionRate: pct,
      };
    });
  }, [wallpaperGridStyle, goals]);

  const appliedStackedGoals = useMemo(() => {
    if (appliedWallpaper.wallpaperGridStyle !== "goals") return [];

    const active = goals.filter((g) => {
      if (!g.startDate || !g.targetDate) return false;
      const target = parseDateKey(g.targetDate);
      return target.getTime() >= new Date().setHours(0, 0, 0, 0);
    });

    return active.map((goal) => {
      const start = parseDateKey(goal.startDate!);
      const target = parseDateKey(goal.targetDate!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalDays = Math.max(
        1,
        Math.round((target.getTime() - start.getTime()) / 86400000) + 1,
      );
      const elapsedDays = Math.max(
        0,
        Math.round((today.getTime() - start.getTime()) / 86400000) + 1,
      );
      const daysLeft = Math.max(0, totalDays - Math.min(elapsedDays, totalDays));
      const pct = Math.round((Math.min(elapsedDays, totalDays) / totalDays) * 100);

      const completedDays = Math.min(totalDays, Math.max(0, elapsedDays - 1));
      const boxes = Array.from({ length: totalDays }, (_, dayIndex) => {
        if (dayIndex < completedDays) return 2;
        if (dayIndex === completedDays && elapsedDays > 0 && elapsedDays <= totalDays) return 3;
        return 0;
      });

      return {
        id: goal.id,
        title: goal.name,
        heatmap: [],
        boxes,
        currentStreak: daysLeft,
        completionRate: pct,
      };
    });
  }, [appliedWallpaper.wallpaperGridStyle, goals]);

  const topHabitNames = useMemo<string[]>(() => {
    if (wallpaperHabitSet !== "none") {
      const set = HABIT_SETS.find((s) => s.key === wallpaperHabitSet);
      if (set?.habits?.length) return [...set.habits.slice(0, 3)];
    }
    const activeHabitNames = flatHabits.slice(0, 3).map((h) => h.name);
    return activeHabitNames.length > 0 ? activeHabitNames : ["Focus", "Consistency", "Growth"];
  }, [wallpaperHabitSet, flatHabits]);

  const habitTextLines = useMemo(() => {
    if (wallpaperHabitSet !== "none") {
      return HABIT_SETS.find((s) => s.key === wallpaperHabitSet)?.habits as string[] | undefined;
    }
    if (wallpaperGridStyle === "widget") return topHabitNames;
    return undefined;
  }, [wallpaperHabitSet, wallpaperGridStyle, topHabitNames]);

  const appliedHabitTextLines = useMemo(() => {
    if (appliedWallpaper.wallpaperHabitSet !== "none") {
      return HABIT_SETS.find((s) => s.key === appliedWallpaper.wallpaperHabitSet)?.habits as
        string[] | undefined;
    }
    if (appliedWallpaper.wallpaperGridStyle === "widget") return topHabitNames;
    return undefined;
  }, [appliedWallpaper.wallpaperHabitSet, appliedWallpaper.wallpaperGridStyle, topHabitNames]);

  useWallpaperSync({
    heatmap: displayedHeatmap,
    heatmapStartMs: heatmapStartDate().getTime(),
    totalStreak: displayedTotalStreak,
    completionRate: displayedRate,
    wallpaperTheme: appliedWallpaper.theme,
    appTheme: theme,
    previewWeeks: appliedWallpaper.previewWeeks,
    wallpaperSync: wallpaperSync && !wallpaperEditorOpen && wallpaperState !== "applying",
    isGoalActive: !!(activeGoalId && goals.some((g) => g.id === activeGoalId)),
    accentColor: wallpaperTokens(appliedWallpaper.theme, appliedWallpaper.gridColorTheme, theme)
      .accent,
    gridStyle: appliedWallpaper.wallpaperGridStyle,
    customPhotoBase64:
      appliedWallpaper.theme === "custom" ? appliedWallpaper.wallpaperCustomPhoto : null,
    photoOverlay: appliedWallpaper.wallpaperPhotoOverlay,
    statsAlignment: appliedWallpaper.wallpaperStatsAlign,
    offsetY:
      typeof window !== "undefined"
        ? 50 + (appliedWallpaper.wallpaperOffset.y / window.innerHeight) * 100
        : 54,
    offsetX: appliedWallpaper.wallpaperOffset.x,
    gridScale: appliedWallpaper.wallpaperScale,
    gridColorTheme: appliedWallpaper.gridColorTheme,
    photoOffsetX: appliedWallpaper.wallpaperPhotoOffset.x,
    photoOffsetY: appliedWallpaper.wallpaperPhotoOffset.y,
    photoScale: appliedWallpaper.wallpaperPhotoScale,
    stackedGoals: appliedStackedGoals,
    habitText: appliedHabitTextLines,
  });

  // Reactive habit reminders scheduler
  useEffect(() => {
    if (!remindersOn) {
      scheduleHabitReminders({ enabled: false });
      return;
    }

    const actualToday = new Date();
    const todayEntries = completionsMap[todayKey()] ?? {};
    const scheduledTodayHabits = rawHabits.filter((h) =>
      isScheduledDay(h.frequency, h.customDays, actualToday),
    );
    const uncompleted = scheduledTodayHabits.filter((h) => !todayEntries[h.id]?.done).length;
    const allDone = scheduledTodayHabits.length > 0 && uncompleted === 0;

    const timer = setTimeout(() => {
      scheduleHabitReminders({
        enabled: true,
        reminderTime,
        morningKickoff,
        uncompletedCount: uncompleted,
        streak: displayedTotalStreak,
        allDone,
        dailySummary,
        habits: scheduledTodayHabits.map((h) => ({
          id: h.id,
          name: h.name,
          reminderTime: h.reminderTime || "",
          done: todayEntries[h.id]?.done || false,
        })),
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [remindersOn, reminderTime, morningKickoff, dailySummary, rawHabits, completionsMap, displayedTotalStreak]);

  const applyWallpaper = async (forceStatic: boolean = false, screenTarget: string = "both") => {
    if (wallpaperState !== "idle") return;
    setWallpaperState("applying");
    try {
      const currentApplied = {
        theme: wallpaperTheme,
        gridColorTheme,
        wallpaperHabitSet,
        wallpaperGridStyle,
        wallpaperCustomPhoto,
        wallpaperPhotoOverlay,
        wallpaperStatsAlign,
        wallpaperOffset,
        wallpaperPhotoOffset,
        wallpaperPhotoScale,
        wallpaperScale,
        previewWeeks,
      };
      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
        const { WallpaperNative } = await import("../lib/wallpaper-bridge");
        const { supported } = await WallpaperNative.isLiveWallpaperSupported();
        if (supported && !forceStatic) {
          const result = await WallpaperNative.setWallpaper({
            heatmap: displayedHeatmap,
            heatmapStartMs: heatmapStartDate().getTime(),
            theme: resolveThemeKey(wallpaperTheme, theme),
            previewWeeks,
            currentStreak: displayedTotalStreak,
            completionRate: displayedRate,
            isGoalActive: !!(activeGoalId && goals.some((g) => g.id === activeGoalId)),
            accentColor: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).accent,
            gridStyle: wallpaperGridStyle,
            customPhotoBase64: wallpaperTheme === "custom" ? wallpaperCustomPhoto : null,
            photoOverlay: wallpaperPhotoOverlay,
            statsAlignment: wallpaperStatsAlign,
            offsetY:
              typeof window !== "undefined"
                ? 50 + (wallpaperOffset.y / window.innerHeight) * 100
                : 54,
            offsetX: wallpaperOffset.x,
            gridScale: wallpaperScale,
            gridColorTheme: gridColorTheme,
            photoOffsetX: wallpaperPhotoOffset.x,
            photoOffsetY: wallpaperPhotoOffset.y,
            photoScale: wallpaperPhotoScale,
            stackedGoals: stackedGoals,
            habitText: habitTextLines,
          });
          if (!result.success) {
            showToast("Wallpaper selection cancelled.");
            return;
          }
          showToast("Live wallpaper applied.", undefined, 4000);
        } else {
          const result = await WallpaperNative.setStaticWallpaper({
            screenTarget,
            heatmap: displayedHeatmap,
            heatmapStartMs: heatmapStartDate().getTime(),
            theme: resolveThemeKey(wallpaperTheme, theme),
            previewWeeks,
            currentStreak: displayedTotalStreak,
            completionRate: displayedRate,
            isGoalActive: !!(activeGoalId && goals.some((g) => g.id === activeGoalId)),
            accentColor: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).accent,
            gridStyle: wallpaperGridStyle,
            customPhotoBase64: wallpaperTheme === "custom" ? wallpaperCustomPhoto : null,
            photoOverlay: wallpaperPhotoOverlay,
            statsAlignment: wallpaperStatsAlign,
            offsetY:
              typeof window !== "undefined"
                ? 50 + (wallpaperOffset.y / window.innerHeight) * 100
                : 54,
            offsetX: wallpaperOffset.x,
            gridScale: wallpaperScale,
            gridColorTheme: gridColorTheme,
            photoOffsetX: wallpaperPhotoOffset.x,
            photoOffsetY: wallpaperPhotoOffset.y,
            photoScale: wallpaperPhotoScale,
            stackedGoals: stackedGoals,
            habitText: habitTextLines,
          });
          if (!result.success) throw new Error("Static wallpaper could not be applied.");
          showToast(`Wallpaper applied to ${screenTarget === "both" ? "home and lock screens" : screenTarget === "home" ? "home screen" : "lock screen"}.`, undefined, 4000);
        }
      } else {
        const cap = await capturePreview();
        if (!cap) throw new Error("Could not generate the wallpaper image.");
        if (cap) {
          const a = document.createElement("a");
          a.href = cap.dataUrl;
          a.download = `grain-lockscreen-${wallpaperTheme}-${Date.now()}.png`;
          a.click();
          showToast("Wallpaper saved \u2014 select Set as Lock Screen in Gallery", undefined, 4000);
        }
      }
      setAppliedWallpaper(currentApplied);

      if (user?.uid) {
        updateUserProfile(user.uid, {
          prefs: {
            wallpaperTheme,
            gridColorTheme,
            wallpaperHabitSet,
            wallpaperGridStyle,
            wallpaperScale,
            wallpaperPhotoOverlay,
            wallpaperStatsAlign,
            wallpaperSync,
            remindersOn,
            timeFilter,
            theme,
            previewWeeks,
            activeGoalId,
            wallpaperOffset,
            wallpaperPhotoOffset,
            wallpaperPhotoScale,
            wallpaperCustomPhoto,
          },
        } as any).catch((err) => toastError("Failed to save wallpaper prefs"));
      }

      setWallpaperState("applied");
      setWallpaperSnapshot(heatmap.map((c) => c.slice()));
    } catch (e: any) {
      if (e?.message?.includes("static")) {
        globalToast(
          "Static wallpaper could not be applied.",
          "error",
          { label: "Try live", onClick: () => void applyWallpaper(false) },
          7000,
        );
      } else {
        globalToast(
          e?.message || "Could not generate the wallpaper image.",
          "error",
          { label: "Try again", onClick: () => void applyWallpaper(forceStatic, screenTarget) },
          7000,
        );
      }
    } finally {
      window.setTimeout(() => setWallpaperState("idle"), 2500);
    }
  };

  const capturePreview = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    const node = previewRef.current;
    if (!node) return null;
    const { toPng } = await import("html-to-image");
    // Render at 3x for crisp wallpaper-quality output.
    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: wallpaperThemeOf(wallpaperTheme, theme).bg.startsWith("#")
        ? wallpaperThemeOf(wallpaperTheme, theme).bg
        : "#000000",
      filter: (n) => !(n instanceof HTMLElement && n.dataset.noCapture !== undefined),
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, dataUrl };
  };

  const shareWallpaperImage = async () => {
    if (captureBusy) return;
    setCaptureBusy("share");
    try {
      const cap = await capturePreview();
      if (!cap) return;
      if (Capacitor.isNativePlatform()) {
        await shareNativeImage(cap.dataUrl);
        return;
      }
      const file = new File([cap.blob], `grain-wallpaper.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
        share?: (d: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "Grain wallpaper",
          text: `${totalStreak}-day streak · ${rate}% today`,
        });
        showToast("Shared");
      } else {
        // Fallback: copy image to clipboard if possible, otherwise download.
        try {
          const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem })
            .ClipboardItem;
          if (ClipboardItemCtor && navigator.clipboard && "write" in navigator.clipboard) {
            await navigator.clipboard.write([new ClipboardItemCtor({ "image/png": cap.blob })]);
            showToast("Image copied — paste to share");
          } else {
            throw new Error("no clipboard");
          }
        } catch {
          const a = document.createElement("a");
          a.href = cap.dataUrl;
          a.download = "grain-wallpaper.png";
          a.click();
          showToast("Saved · sharing not supported here");
        }
      }
      if (navigator.vibrate) navigator.vibrate(18);
    } catch (err) {
      const name = (err as { name?: string } | undefined)?.name;
      if (name !== "AbortError") showToast("Could not share wallpaper");
    } finally {
      setCaptureBusy(null);
    }
  };

  const saveWallpaperImage = async () => {
    if (captureBusy) return;
    setCaptureBusy("save");
    try {
      const cap = await capturePreview();
      if (!cap) return;
      if (!(await exportImage(cap.dataUrl, `grain-${wallpaperTheme}-${Date.now()}.png`))) return;
      if (!user) return;
      try {
        updateLocalPrefs(user.uid, {
            wallpaperTheme,
            gridColorTheme,
            wallpaperHabitSet,
            wallpaperGridStyle,
            wallpaperScale,
            wallpaperPhotoOverlay,
            wallpaperStatsAlign,
            wallpaperSync,
            remindersOn,
            timeFilter,
            theme,
            previewWeeks,
            activeGoalId,
            wallpaperOffset,
            wallpaperPhotoOffset,
            wallpaperPhotoScale,
        });
      } catch (err) {
        toastError("Failed to save wallpaper prefs");
      }
      showToast("Saved to downloads");
      if (navigator.vibrate) navigator.vibrate(18);
    } catch {
      showToast("Could not save wallpaper");
    } finally {
      setCaptureBusy(null);
    }
  };

  const exportBackup = async () => {
    try {
      if (!userId) throw new Error("Not signed in");
      const payload = exportLocalBackup(userId);
      if (!(await downloadBackup(payload))) return;
      markLocalBackupExported(userId);
      setBackupStatus(getLocalBackupStatus(userId));
      showToast(`Backup downloaded · ${flatHabits.length} habits`);
    } catch {
      globalToast("Backup could not be downloaded.", "error", { label: "Try again", onClick: exportBackup }, 6000);
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;
    try {
      const payload = JSON.parse(await file.text());
      importLocalBackup(userId, payload);
      showToast("Backup restored · Reloading local data");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      globalToast(
        error instanceof Error ? error.message : "Backup could not be imported",
        "error",
        { label: "Choose file", onClick: () => backupInputRef.current?.click() },
        7000,
      );
    }
  };

  const resetToday = async () => {
    try {
      if (userId) clearLocalCompletionDate(userId, formatDateKey(new Date()));
      try {
        navigator.vibrate?.([28, 60, 40]);
      } catch {}
      showToast("Today's progress cleared");
    } catch {
      showToast("Reset failed");
    }
  };

  const saveProfile = async (next: { name: string; tagline: string; initials: string }) => {
    setProfile((p) => ({ ...p, ...next }));
    if (userId) {
      await updateUserProfile(userId, next);
    }
    showToast("Profile saved");
  };

  const updateHabit = async (q: Quadrant, i: number, patch: Partial<Habit>) => {
    const habit = habits[q][i];
    if (!habit) return;
    await updateHabitDoc(habit.id, patch);
    showToast("Habit updated");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const maxW = 1080;
      const maxH = 1920;
      const ratio = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
      const width = Math.max(1, Math.round(bitmap.width * ratio));
      const height = Math.max(1, Math.round(bitmap.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Image processing is unavailable");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Image compression failed"))),
          "image/jpeg",
          0.72,
        );
      });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("Image reading failed"));
        reader.readAsDataURL(blob);
      });

      setWallpaperCustomPhoto(dataUrl);
      // A new image starts with a clean crop, then immediately enters the
      // adjustment mode so the user—not object-cover—chooses the framing.
      setWallpaperPhotoOffset({ x: 0, y: 0 });
      setWallpaperPhotoScale(1);
      setWallpaperTheme("custom");
      setIsRepositionMode(false);
      setIsMovingPhoto(true);
      showToast("Adjust the crop, then tap Done crop");
    } catch (error) {
      console.error("[wallpaper upload]", error);
      showToast("Could not process that photo");
    }
  };
  const bestStreak = heatmapStats.bestStreak;

  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialOffset: { x: number; y: number };
    initialScale: number;
    initialPhotoOffset: { x: number; y: number };
    initialPhotoScale: number;
    initialDistance: number | null;
    pointers: Map<number, { x: number; y: number }>;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialOffset: { x: 0, y: 0 },
    initialPhotoOffset: { x: 0, y: 0 },
    initialScale: 1,
    initialPhotoScale: 1,
    initialDistance: null,
    pointers: new Map(),
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (showGridGestureHint) {
      setShowGridGestureHint(false);
      try {
        localStorage.setItem("grain_grid_gesture_learned", "true");
      } catch {}
    }
    const state = dragState.current;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.pointers.size === 1) {
      state.isDragging = true;
      setIsDraggingWallpaper(true);
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.initialOffset = { ...wallpaperOffset };
      state.initialPhotoOffset = { ...wallpaperPhotoOffset };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    } else if (state.pointers.size === 2) {
      const pts = Array.from(state.pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      state.initialDistance = dist;
      state.initialScale = wallpaperScale;
      state.initialPhotoScale = wallpaperPhotoScale;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state.pointers.has(e.pointerId)) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.pointers.size === 1 && state.isDragging) {
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (isMovingPhoto) {
        const newX = state.initialPhotoOffset.x + dx;
        const newY = state.initialPhotoOffset.y + dy;
        if (wallpaperPhotoRef.current) {
          wallpaperPhotoRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${wallpaperPhotoScale})`;
        }
      } else {
        let newX = state.initialOffset.x + dx;
        let newY = state.initialOffset.y + dy;
        if (Math.abs(newX) < 15) newX = 0;
        if (Math.abs(newY) < 15) newY = 0;
        if (wallpaperGridRef.current) {
          wallpaperGridRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${wallpaperScale})`;
        }
      }
    } else if (state.pointers.size === 2 && state.initialDistance !== null) {
      const pts = Array.from(state.pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scaleDiff = dist / state.initialDistance;
      if (isMovingPhoto) {
        const newScale = Math.max(1, Math.min(10, state.initialPhotoScale * scaleDiff));
        if (wallpaperPhotoRef.current) {
          wallpaperPhotoRef.current.style.transform = `translate(${wallpaperPhotoOffset.x}px, ${wallpaperPhotoOffset.y}px) scale(${newScale})`;
        }
      } else {
        const newScale = Math.max(0.2, Math.min(5, state.initialScale * scaleDiff));
        if (wallpaperGridRef.current) {
          wallpaperGridRef.current.style.transform = `translate(${wallpaperOffset.x}px, ${wallpaperOffset.y}px) scale(${newScale})`;
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const state = dragState.current;
    state.pointers.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (state.pointers.size < 2) {
      if (state.initialDistance !== null) {
        if (isMovingPhoto) {
          const match = wallpaperPhotoRef.current?.style.transform.match(/scale\(([^)]+)\)/);
          if (match) setWallpaperPhotoScale(parseFloat(match[1]));
        } else {
          const match = wallpaperGridRef.current?.style.transform.match(/scale\(([^)]+)\)/);
          if (match) setWallpaperScale(parseFloat(match[1]));
        }
      }
      state.initialDistance = null;
    }

    if (state.pointers.size === 0) {
      state.isDragging = false;
      setIsDraggingWallpaper(false);

      if (isMovingPhoto) {
        const match = wallpaperPhotoRef.current?.style.transform.match(
          /translate\(([^p]+)px,\s*([^p]+)px\)/,
        );
        if (match) setWallpaperPhotoOffset({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
      } else {
        const match = wallpaperGridRef.current?.style.transform.match(
          /translate\(([^p]+)px,\s*([^p]+)px\)/,
        );
        if (match) setWallpaperOffset({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
      }
    } else if (state.pointers.size === 1) {
      const remaining = Array.from(state.pointers.values())[0];
      state.startX = remaining.x;
      state.startY = remaining.y;

      if (isMovingPhoto) {
        const match = wallpaperPhotoRef.current?.style.transform.match(
          /translate\(([^p]+)px,\s*([^p]+)px\)/,
        );
        if (match) {
          state.initialPhotoOffset = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
          setWallpaperPhotoOffset(state.initialPhotoOffset);
        }
      } else {
        const match = wallpaperGridRef.current?.style.transform.match(
          /translate\(([^p]+)px,\s*([^p]+)px\)/,
        );
        if (match) {
          state.initialOffset = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
          setWallpaperOffset(state.initialOffset);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.002;
    if (isMovingPhoto) {
      setWallpaperPhotoScale((s) => Math.max(1, Math.min(10, s - e.deltaY * zoomSensitivity)));
    } else {
      setWallpaperScale((s) => Math.max(0.2, Math.min(5, s - e.deltaY * zoomSensitivity)));
    }
  };

  const renderSettingsMenu = () => {
    const tabs = [
      "theme",
      "style",
      "color",
      "habits",
      "stats",
    ] as const;
    return (
      <div className="flex flex-col gap-5 w-full animate-fade-in">
        {/* Category Tabs */}
        <div className="w-full">
          <WheelPicker
            options={tabs.map((tab) => ({
              key: tab,
              label: tab.toUpperCase(),
            }))}
            value={activeSettingTab}
            onChange={(v) => setActiveSettingTab(v as any)}
            itemWidth={90}
            fontSizeClass="text-[11px] font-bold tracking-[0.1em]"
          />
        </div>

        {/* Active Tab Content */}
        <div className="min-h-[50px] flex items-center justify-center w-full px-1">
          {activeSettingTab === "theme" && (
            <div className="w-full animate-fade-in-right">
              <WheelPicker
                options={WALLPAPER_THEMES.filter((t) => t.key !== "custom").map((t) => ({
                  key: t.key,
                  label: t.label,
                }))}
                value={wallpaperTheme}
                onChange={(v) => {
                  setWallpaperTheme(v);
                  showToast(`${WALLPAPER_THEMES.find((t) => t.key === v)?.label} applied`);
                }}
                itemWidth={110}
                fontSizeClass="text-[14px]"
              />
            </div>
          )}
          {activeSettingTab === "color" && (
            <AccentPalette value={gridColorTheme} onChange={setGridColorTheme} />
          )}

          {activeSettingTab === "habits" && (
            <div className="w-full animate-fade-in-right">
              <WheelPicker
                options={[...HABIT_SETS]}
                value={wallpaperHabitSet}
                onChange={(v) => {
                  setWallpaperHabitSet(v);
                  showToast(`${HABIT_SETS.find((h) => h.key === v)?.label} habits`);
                }}
                itemWidth={75}
                fontSizeClass="text-[14px]"
              />
            </div>
          )}

          {activeSettingTab === "stats" && (
            <div className="w-full animate-fade-in-right">
              <WheelPicker
                options={[
                  { key: "left", label: "Left" },
                  { key: "center", label: "Center" },
                  { key: "right", label: "Right" },
                ]}
                value={wallpaperStatsAlign}
                onChange={(v) => {
                  setWallpaperStatsAlign(v as any);
                  showToast(
                    `Stats align: ${v === "left" ? "Left" : v === "center" ? "Center" : "Right"}`,
                  );
                }}
                itemWidth={75}
                fontSizeClass="text-[14px]"
              />
            </div>
          )}

          {activeSettingTab === "style" && (
            <div className="w-full animate-fade-in-right">
              <WheelPicker
                options={[
                  { key: "weeks", label: "7 days" },
                  { key: "month", label: "Month Cal" },
                  { key: "year", label: "Year" },
                  { key: "goals", label: "Goals" },
                ]}
                value={wallpaperGridStyle}
                onChange={(v) => {
                  setWallpaperGridStyle(v as any);
                  showToast(
                    `${v === "weeks" ? "7 days" : v === "month" ? "Month Cal" : v === "year" ? "Year" : "Goals"} layout`,
                  );
                }}
                itemWidth={95}
                fontSizeClass="text-[14px]"
              />
            </div>
          )}

        </div>
      </div>
    );
  };

  const appBackgroundImage =
    theme === "light"
      ? "/grain-light.jpg"
      : "/back2.jpg";
  const backgroundExtensionImage = appBackgroundImage;

  return (
    <main
      data-theme={theme}
      data-app-visible={pageVisible ? "true" : "false"}
      className="fixed inset-0 flex h-full w-full justify-center bg-[var(--backdrop)] overflow-hidden"
    >
      {activeToast && (
        <FeedbackToast key={activeToast.id} notice={activeToast} onDismiss={removeToast} />
      )}
      <input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup} />

      {/* Main app container - 100% Full Edge-to-Edge Responsive */}
      <div className="relative flex h-full w-full flex-col bg-canvas pt-safe pb-safe overflow-hidden">
        <div
          data-throttle={throttled ? "1" : "0"}
          className="relative flex h-full w-full flex-1 flex-col overflow-hidden bg-transparent"
          style={(() => {
            const wt = wallpaperTokens(wallpaperTheme, gridColorTheme, theme);
            return {
              ["--wp-bg"]: wt.bg,
              ["--wp-fg"]: wt.fg,
              ["--wp-fg-soft"]: wt.fgSoft,
              ["--wp-empty"]: wt.empty,
              ["--wp-low"]: wt.low,
              ["--wp-mid"]: wt.mid,
              ["--wp-hi"]: wt.hi,
              ["--wp-accent"]: wt.accent,
              ["--wp-accent-soft"]: wt.accentSoft,
            } as Record<string, string>;
          })()}
        >
          {/* Shared background extension for the app's floating glass surfaces. */}
          {backgroundExtensionImage && (
            <div className="background-extension background-extension-photo" aria-hidden="true">
              <img
                key={backgroundExtensionImage}
                src={backgroundExtensionImage}
                alt=""
                className="background-extension-image"
                style={{ objectPosition: "center center" }}
              />
              <div className="background-extension-scrim" />
            </div>
          )}

          {/* Liquid drifting blobs — animated blur gradient ambient light for all non-consistency screens (hidden in AMOLED theme for 120 FPS max performance) */}
          <div
            className={`pointer-events-none absolute inset-0 overflow-hidden z-0 transition-opacity duration-700 ease-in-out ${"ambient-paused opacity-0 pointer-events-none"}`}
          >
            <div
              className="liquid-blob absolute -left-24 -top-24 h-72 w-72 rounded-full"
              style={{ background: "color-mix(in oklab, var(--ink) 22%, transparent)" }}
              aria-hidden
            />
            <div
              className="liquid-blob absolute top-1/3 -right-24 h-80 w-80 rounded-full"
              style={{
                background: "color-mix(in oklab, var(--ink) 14%, transparent)",
                animationDelay: "-5s",
              }}
              aria-hidden
            />
            <div
              className="liquid-blob absolute -bottom-24 left-1/4 h-64 w-64 rounded-full"
              style={{
                background: "color-mix(in oklab, var(--ink) 18%, transparent)",
                animationDelay: "-9s",
              }}
              aria-hidden
            />
          </div>

          {/* Photographic Trekking Peak Background — Smoothly fades in ONLY for Consistency Tab */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-100 scale-100 transition-all duration-700 ease-in-out">
            <img
              key={appBackgroundImage}
              src={appBackgroundImage}
              alt=""
              className={`app-background-image w-full h-full object-cover transition-transform duration-1000 ease-out ${
                theme === "light"
                  ? "opacity-100 saturate-100 brightness-100"
                  : "opacity-30 saturate-[0.82] brightness-[0.66]"
              }`}
              style={{
                objectPosition: "center center",
              }}
            />
          </div>

          {/* Profile button */}
          <div className="absolute top-4 left-0 right-0 z-40 flex items-center justify-end px-4 pointer-events-none">
            {/* Profile Button (Top Right) */}
            <button
              onClick={() => setSettingsOpen(true)}
              type="button"
              aria-label="Open settings"
              className="pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-on-ink shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition active:scale-95 hover:scale-105"
            >
              {user?.email?.[0]?.toUpperCase() || "U"}
            </button>
          </div>

          {(dataError || (backupStatus?.reminderDue && !onboardingOpen)) && (
            <div className="shrink-0 space-y-2 pt-16">
          {dataError && (
            <DataStatusBanner
              message={dataError.message || "Some local data could not be loaded. Your saved items remain on this device."}
              onRetry={retryData}
              recoveryAction={{ label: "Import backup", onClick: () => backupInputRef.current?.click() }}
            />
          )}

          {backupStatus?.reminderDue && !onboardingOpen && (
            <BackupReminderBanner
              onBackup={exportBackup}
              onLater={() => {
                if (!userId) return;
                dismissLocalBackupReminder(userId);
                setBackupStatus(getLocalBackupStatus(userId));
                showToast("Backup reminder snoozed for 3 days");
              }}
            />
          )}
            </div>
          )}

          <div
            className="relative flex flex-1 w-full overflow-hidden"
            style={{ touchAction: "pan-y" }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              tabTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = tabTouchStartRef.current;
              tabTouchStartRef.current = null;
              if (!start) return;
              const touch = event.changedTouches[0];
              const dx = touch.clientX - start.x;
              const dy = touch.clientY - start.y;
              if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
              const currentIndex = TAB_ORDER.indexOf(activeTab);
              const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
              const nextTab = TAB_ORDER[nextIndex];
              if (nextTab) switchTab(nextTab);
            }}
          >
            {/* TAB 1: TODAY */}
            {activeTab === "today" && (
              <div
                data-tab-id="today"
                className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-52"
                ref={activeTab === "today" ? scrollRef : undefined}
              >
                <div className="today-content space-y-4 pt-16">
                  {/* Unified Hero: streak + ring + date selector */}
                  <TodayHero
                    streak={totalStreak}
                    rate={rate}
                    done={doneCount}
                    total={totalCount}
                    nextHabit={(() => {
                      for (const q of QUADRANT_ORDER) {
                        const next = scheduledHabitsByQuadrant[q].find(({ habit }) => !habit.done);
                        if (next) return { q, i: next.index, habit: next.habit as any };
                      }
                      return null;
                    })()}
                    onCompleteNext={(q: Quadrant, i: number) => {
                      if (habits[q][i]?.type === "numeric") void adjustValue(q, i, 1);
                      else void toggleDone(q, i);
                    }}
                    dateSelectorSlot={
                      <div className="relative">
                        {dateStyle === "underline" && (
                          <div className="flex items-center justify-between border-y border-[color:var(--hairline)] py-4">
                            {getWeekDates(new Date()).map((date) => {
                              const active = isSameDay(date, selectedDate);
                              const isTodayDate = isSameDay(date, new Date());
                              return (
                                <button
                                  key={date.toISOString()}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    if (!isTodayDate)
                                      showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                                  }}
                                  className={`flex flex-col items-center gap-1 transition ${active ? "text-ink" : "text-body hover:text-ink"}`}
                                >
                                  <span
                                    className={`text-[10px] font-black uppercase tracking-widest ${active ? "opacity-100" : "opacity-40"}`}
                                  >
                                    {shortDay(date)}
                                  </span>
                                  <span
                                    className={`font-display text-lg font-black tabular-nums ${active ? "underline decoration-2 underline-offset-4" : ""}`}
                                  >
                                    {date.getDate()}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {dateStyle === "block" && (
                          <div className="flex items-center justify-between py-2 px-1">
                            {getWeekDates(new Date()).map((date) => {
                              const active = isSameDay(date, selectedDate);
                              const isTodayDate = isSameDay(date, new Date());
                              return (
                                <button
                                  key={date.toISOString()}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    if (!isTodayDate)
                                      showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                                  }}
                                  className={`flex flex-col items-center justify-center h-14 w-12 transition ${
                                    active
                                      ? "bg-ink text-[color:var(--canvas)] scale-110 shadow-lg"
                                      : "text-mute hover:text-ink hover:bg-canvas-soft"
                                  }`}
                                >
                                  <span
                                    className={`text-[9px] font-black uppercase tracking-widest ${active ? "opacity-90" : ""}`}
                                  >
                                    {shortDay(date)}
                                  </span>
                                  <span
                                    className={`font-display text-xl font-black tabular-nums mt-0.5`}
                                  >
                                    {date.getDate()}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {dateStyle === "mono" && (
                          <div className="flex items-center justify-between border-2 border-ink p-1">
                            {getWeekDates(new Date()).map((date) => {
                              const active = isSameDay(date, selectedDate);
                              const isTodayDate = isSameDay(date, new Date());
                              return (
                                <button
                                  key={date.toISOString()}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    if (!isTodayDate)
                                      showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                                  }}
                                  className={`flex flex-col items-center justify-center p-2 font-mono transition ${
                                    active
                                      ? "bg-ink text-[color:var(--canvas)]"
                                      : "text-body hover:bg-ink/10"
                                  }`}
                                >
                                  <span className="text-[10px] uppercase font-bold tracking-tighter">
                                    {active ? `[${shortDay(date)}]` : shortDay(date)}
                                  </span>
                                  <span className="text-sm font-bold mt-1">
                                    {date.getDate().toString().padStart(2, "0")}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    }
                  />

                  {/* Habits checklist — no section header (info is in the Hero) */}
                  <section className="px-4">
                    {habitsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-mute">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading your habits…
                      </div>
                    ) : totalCount === 0 ? (
                      <GrainState icon={Plus} eyebrow="Today" title="Small actions. Lasting change." description="Choose one habit you can return to. Your progress starts with a single check-in." action={{ label: "Create habit", onClick: () => setModalOpen(true) }} />
                    ) : (
                      <div className="habit-list-surface overflow-hidden rounded-[24px]">
                        {QUADRANT_ORDER.flatMap((q) =>
                          scheduledHabitsByQuadrant[q].map(({ habit, index }) => ({
                            q,
                            habit,
                            index,
                          })),
                        ).map(({ q, habit: h, index: i }, rowIndex, rows) => (
                          <HabitCard
                            key={`${q}-${i}-${(h as any).id || h.name}`}
                            habit={h}
                            quadrant={q}
                            index={i}
                            onToggle={toggleDone}
                            onOpenDetail={(quad, idx) => {
                              setDetail({ q: quad, i: idx });
                              setNoteDraft(completions[habits[quad][idx].id]?.note ?? "");
                            }}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedHabitIds.has(h.id)}
                            onSelectToggle={toggleSelectHabit}
                            onLongPress={handleHabitLongPress}
                            showDivider={rowIndex < rows.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* TAB 2: CONSISTENCY */}
            {activeTab === "consistency" && (
              <div
                data-tab-id="consistency"
                className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-28"
                ref={activeTab === "consistency" ? scrollRef : undefined}
              >
                <div>
                  <Suspense fallback={<DeferredTabFallback />}>
                    <ConsistencyTab
                      heatmap={heatmap}
                      selectedHabit={selectedHabit}
                      setSelectedHabit={setSelectedHabit}
                      doneCount={consistencySummary.done}
                      totalCount={consistencySummary.total}
                      totalStreak={consistencySummary.streak}
                      bestStreak={consistencySummary.best}
                      rate={consistencySummary.rate}
                      weeklyInsights={weeklyInsights}
                      showToast={showToast}
                      onOpenWeeklyReview={() => setWeeklyReviewOpen(true)}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {/* TAB 3: MY DAY */}
            {activeTab === "myday" && (
              <div
                data-tab-id="myday"
                className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-28"
                ref={activeTab === "myday" ? scrollRef : undefined}
              >
                <div className="pt-16 pb-32">
                  <section className="px-5">
                    {totalCount === 0 ? (
                      <GrainState icon={Sun} eyebrow="My day" title="Start with one small action." description="Add a habit to give your daily routine a little direction." action={{ label: "Create habit", onClick: () => setModalOpen(true) }} />
                    ) : (
                      <>
                        {(() => {
                          const pending = scheduledHabits.filter((habit) => !habit.done);
                          const hour = new Date().getHours();
                          const currentTime =
                            hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
                          const recommended =
                            pending.find((habit) => habit.id === myDayOverrideId) ??
                            pending.find((habit) => habit.time === currentTime && habit.pinned) ??
                            pending.find((habit) => habit.time === currentTime) ??
                            pending.find((habit) => habit.pinned) ??
                            pending[0];

                          if (!recommended) {
                            return (
                              <GrainState className="absolute inset-x-5 top-1/2 -translate-y-1/2 animate-fade-in" icon={Check} eyebrow="My day" title="Today is complete." description={`You finished all ${totalCount} habits. Enjoy the rest of your day.`} />
                            );
                          }

                          const habitIndex = habits[recommended.quadrant].findIndex(
                            (habit) => habit.id === recommended.id,
                          );
                          const isNumeric = Boolean(recommended.isNumeric || recommended.target);
                          const completed = scheduledHabits.filter((habit) => habit.done);
                          const completionPercent = totalCount
                            ? Math.round((doneCount / totalCount) * 100)
                            : 0;
                          return (
                            <div className="flex flex-col gap-5 animate-fade-in">
                              <div className="flex items-end justify-between px-1">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mute">
                                    Finish today
                                  </p>
                                  <h2 className="mt-1 font-display text-xl font-bold text-ink">
                                    {pending.length} habit{pending.length === 1 ? "" : "s"} left
                                  </h2>
                                </div>
                                <div
                                  className="grid h-11 w-11 place-items-center rounded-full text-[10px] font-bold text-ink"
                                  style={{
                                    background: `conic-gradient(var(--ink) ${completionPercent}%, color-mix(in srgb, var(--ink) 12%, transparent) 0)`,
                                  }}
                                  aria-label={`${doneCount} of ${totalCount} habits complete`}
                                >
                                  <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas">
                                    {doneCount}/{totalCount}
                                  </span>
                                </div>
                              </div>

                              <div className="settings-glass specular rounded-3xl p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mute">
                                  Up next
                                </p>
                                <div className="mt-3">
                                    <h3 className="font-display text-lg font-bold text-ink">
                                      {recommended.name}
                                    </h3>
                                    <p className="mt-1 text-xs capitalize text-body">
                                      {recommended.time || "anytime"} ·{" "}
                                      {recommended.category || "Personal"}
                                    </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isNumeric) {
                                      setDetail({ q: recommended.quadrant, i: habitIndex });
                                      setNoteDraft(completions[recommended.id]?.note ?? "");
                                    } else {
                                      void completeHabit(recommended);
                                      setMyDayOverrideId(null);
                                    }
                                  }}
                                  className="settings-control mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-ink shadow-lg transition active:scale-[0.98] hover:brightness-110"
                                >
                                  <Check className="h-4 w-4" strokeWidth={3} />{" "}
                                  {isNumeric ? "Log progress" : "Complete habit"}
                                </button>
                              </div>

                              {pending.length > 1 && (
                                <div>
                                  <div className="mb-2 flex items-center justify-between px-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mute">
                                      Choose another
                                    </p>
                                    <span className="text-[11px] text-body">
                                      Best for your {currentTime}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                    {pending
                                      .filter((habit) => habit.id !== recommended.id)
                                      .slice(0, 5)
                                      .map((habit) => (
                                        <button
                                          key={habit.id}
                                          type="button"
                                          onClick={() => setMyDayOverrideId(habit.id)}
                                          className="min-w-32 rounded-2xl border border-[color:var(--hairline)] bg-[color:color-mix(in_srgb,var(--canvas)_42%,transparent)] px-3 py-2.5 text-left opacity-75 transition hover:opacity-100 active:scale-95"
                                        >
                                          <p className="truncate text-xs font-bold text-ink">
                                            {habit.name}
                                          </p>
                                          <p className="mt-1 text-[10px] capitalize text-mute">
                                            {habit.time || "anytime"}
                                          </p>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {completed.length > 0 && (
                                <div className="settings-glass overflow-hidden rounded-2xl">
                                  <button
                                    type="button"
                                    onClick={() => setMyDayCompletedOpen((open) => !open)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-body"
                                  >
                                    <span>{completed.length} completed today</span>
                                    <span className="text-mute">
                                      {myDayCompletedOpen ? "Hide" : "View"}
                                    </span>
                                  </button>
                                  <CollapseMotion open={myDayCompletedOpen}>
                                    <div className="border-t border-[color:var(--hairline)] px-4 py-2">
                                      {completed.map((habit) => (
                                        <p
                                          key={habit.id}
                                          className="py-1 text-xs text-mute line-through"
                                        >
                                          {habit.name}
                                        </p>
                                      ))}
                                    </div>
                                  </CollapseMotion>
                                </div>
                              )}
                              <p className="hidden text-center text-xs text-body">
                                {doneCount} completed today · Your completed habits stay out of the
                                way.
                              </p>
                            </div>
                          );
                        })()}

                        <div className="hidden">
                          {TIME_ORDER.map((timeKey) => {
                            const timeHabits = scheduledHabits.filter(
                              (h) => h.time === timeKey || (!h.time && timeKey === "any"),
                            );

                            if (timeHabits.length === 0) return null;

                            const timeIcons = {
                              morning: (
                                <Sunrise className="w-[18px] h-[18px] text-[color:var(--brand)]" />
                              ),
                              afternoon: (
                                <Sun className="w-[18px] h-[18px] text-[color:var(--brand)]" />
                              ),
                              evening: (
                                <Moon className="w-[18px] h-[18px] text-[color:var(--brand)]" />
                              ),
                              any: <Infinity className="w-[18px] h-[18px] text-[#3b82f6]" />,
                            };

                            const timeTitles = {
                              morning: "Morning",
                              afternoon: "Afternoon",
                              evening: "Evening",
                              any: "Anytime",
                            };

                            return (
                              <div
                                key={timeKey}
                                className="habit-list-surface relative flex w-full flex-col overflow-hidden rounded-[24px] transition-all"
                              >
                                <div className="flex items-center justify-between px-4 py-3 text-left">
                                  <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                                    {timeIcons[timeKey]}
                                    {timeTitles[timeKey]}
                                  </h3>
                                  <span className="text-[11px] font-medium tabular-nums text-mute">
                                    {timeHabits.filter((h) => h.done).length}/{timeHabits.length}
                                  </span>
                                </div>
                                <div className="px-3 pb-3 pt-0 space-y-1.5">
                                  {timeHabits.map((h, i) => (
                                    <HabitRow
                                      key={h.id}
                                      habit={h}
                                      justDone={false}
                                      menuOpen={openMenuId === h.id}
                                      onMenuToggle={() =>
                                        setOpenMenuId(openMenuId === h.id ? null : h.id)
                                      }
                                      onMenuClose={() => setOpenMenuId(null)}
                                      onToggle={() => completeHabit(h)}
                                      onRest={() => setHabitRestDay(h.id)}
                                      onPin={() => {
                                        togglePin(
                                          h.quadrant,
                                          habits[h.quadrant].findIndex((hx) => hx.id === h.id),
                                        );
                                        setOpenMenuId(null);
                                      }}
                                      onDelete={() => {
                                        deleteHabit(
                                          h.quadrant,
                                          habits[h.quadrant].findIndex((hx) => hx.id === h.id),
                                        );
                                        setOpenMenuId(null);
                                      }}
                                      onMove={() =>
                                        moveHabit(
                                          h.quadrant,
                                          habits[h.quadrant].findIndex((hx) => hx.id === h.id),
                                        )
                                      }
                                      onEdit={() =>
                                        setEditHabitTarget({
                                          q: h.quadrant,
                                          i: habits[h.quadrant].findIndex((hx) => hx.id === h.id),
                                        })
                                      }
                                      onAdjust={(dir) =>
                                        adjustValue(
                                          h.quadrant,
                                          habits[h.quadrant].findIndex((hx) => hx.id === h.id),
                                          dir,
                                        )
                                      }
                                      onSetValue={(val) => setHabitValue(h.id, val, h.target ?? 1)}
                                      onOpenDetail={() => {
                                        setDetail({
                                          q: h.quadrant,
                                          i: habits[h.quadrant].findIndex((hx) => hx.id === h.id),
                                        });
                                        setNoteDraft(completions[h.id]?.note ?? "");
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* Goal Tab */}
            {activeTab === "goal" && (
              <div
                data-tab-id="goal"
                className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-28"
                ref={activeTab === "goal" ? scrollRef : undefined}
              >
                <div className="pt-16 pb-32">
                  <Suspense fallback={<DeferredTabFallback />}>
                    <GoalTab
                      goals={goals}
                      onDelete={async (id) => {
                        if (id === activeGoalId) {
                          setActiveGoalId(null);
                          if (userId) {
                            updateLocalPrefs(userId, { activeGoalId: null });
                          }
                        }
                        await deleteGoal(userId!, id);
                      }}
                      onSetActiveGoal={async (id) => {
                        setActiveGoalId(id);
                        if (userId) {
                          updateLocalPrefs(userId, { activeGoalId: id });
                        }
                      }}
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </div>

          {/* Liquid Glass Bulk Action Bar (When selecting habits) */}
          {isSelectionMode ? (
            <div className="absolute bottom-4 left-0 right-0 z-40 mx-4 pointer-events-none animate-fade-in-up">
              <nav className="pointer-events-auto mx-auto flex max-w-[380px] items-center justify-between gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--hairline)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--canvas)_85%,transparent)] p-1.5 backdrop-blur-2xl shadow-2xl specular">
                <div className="flex items-center gap-1 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.vibrate?.(10);
                      } catch {}
                      setIsSelectionMode(false);
                      setSelectedHabitIds(new Set());
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-soft text-ink hover:bg-ink/10 active:scale-95 transition"
                    aria-label="Cancel selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[12px] font-bold text-ink tabular-nums ml-1">
                    {selectedHabitIds.size} selected
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.vibrate?.(10);
                      } catch {}
                      const allIds = flatHabits.map((h) => h.id).filter(Boolean);
                      if (selectedHabitIds.size === allIds.length) {
                        setSelectedHabitIds(new Set());
                        setIsSelectionMode(false);
                      } else {
                        setSelectedHabitIds(new Set(allIds));
                      }
                    }}
                    className="text-[11px] font-bold text-body hover:text-ink transition px-2.5 py-1.5 rounded-full hover:bg-ink/5"
                  >
                    {selectedHabitIds.size === flatHabits.length ? "Deselect all" : "Select all"}
                  </button>

                  <button
                    type="button"
                    disabled={selectedHabitIds.size === 0}
                    onClick={() => {
                      if (selectedHabitIds.size === 0) return;
                      try {
                        navigator.vibrate?.(15);
                      } catch {}
                      setBulkDeleteConfirmOpen(true);
                    }}
                    className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 ${
                      selectedHabitIds.size > 0
                        ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/30"
                        : "bg-canvas-soft text-mute opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete ({selectedHabitIds.size})</span>
                  </button>
                </div>
              </nav>
            </div>
          ) : (
            <BottomNavigation
              activeTab={activeTab}
              onSwitchTab={switchTab}
              onOpenDeck={openDeck}
              advancedFeaturesUnlocked={habitsLoading || hasFirstCompletion}
            />
          )}

          {/* FAB */}
          {!isSelectionMode && activeTab === "today" && (
            <button
              onClick={() => setModalOpen(true)}
              className="liquid-fab floating-deck-aligned fixed bottom-[96px] z-30 mb-safe grid h-14 w-14 place-items-center rounded-full text-ink transition active:scale-95 hover:scale-105"
              aria-label="Add habit"
            >
              <Plus className="h-6 w-6" strokeWidth={2.25} />
            </button>
          )}


          {/* Fullscreen wallpaper lock-screen preview removed */}

          {/* Swipe Mode Full Screen */}
          {swipeMode && (
            <Suspense fallback={null}>
              <SwipeModeView
                habits={Object.fromEntries(QUADRANT_ORDER.map((q) => [q, scheduledHabitsByQuadrant[q].map(({ habit }) => habit)])) as Record<Quadrant, Habit[]>}
                onClose={() => setSwipeMode(false)}
                onToggleDone={(habitId) => {
                  for (const q of QUADRANT_ORDER) {
                    const i = habits[q].findIndex((h) => h.id === habitId);
                    if (i !== -1) {
                      toggleDone(q, i);
                      break;
                    }
                  }
                }}
                onMarkSkipped={(habitId) => {
                  markHabitSkipped(habitId);
                }}
              />
            </Suspense>
          )}

          {/* Settings Full Screen */}
          {settingsOpen && (
            <div className="fixed inset-0 z-50 flex flex-col bg-canvas animate-fade-in-up">
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 pb-3"
                style={{
                  paddingTop: "calc(max(var(--sa-top, env(safe-area-inset-top)), 24px) + 16px)",
                }}
              >
                <h1 className="font-display text-xl font-bold text-ink tracking-tight">Settings</h1>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="liquid-control grid h-8 w-8 place-items-center rounded-full text-ink transition hover:brightness-110 active:scale-95"
                  aria-label="Close settings"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-safe">
                {/* Profile strip */}
                <div className="settings-glass mt-2 flex items-center gap-3 rounded-3xl p-4">
                  <div className="relative shrink-0">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-ink text-on-ink font-display text-base font-bold">
                      {profile.initials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 ring-2 ring-[color:var(--canvas)]">
                      <Flame className="h-2.5 w-2.5 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-ink truncate">
                        {profile.name}
                      </span>
                    </div>
                    <p className="text-xs text-mute truncate">
                      {totalStreak} day streak · {rate}% today
                    </p>
                  </div>
                  <button
                    onClick={() => setProfileEditOpen(true)}
                    className="settings-control shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-ink transition active:scale-95"
                    aria-label="Edit profile"
                  >
                    Edit
                  </button>
                </div>

                {/* Quick actions row */}
                <div className="my-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setAiCoachOpen(true);
                    }}
                    className="settings-glass flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl py-3 text-[11px] font-semibold text-ink transition active:scale-95"
                  >
                    <MessageSquare className="h-4 w-4 text-mute" strokeWidth={2} /> Coach
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setBadgesOpen(true);
                    }}
                    className="settings-glass flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl py-3 text-[11px] font-semibold text-ink transition active:scale-95"
                  >
                    <Hexagon className="h-4 w-4 text-mute" strokeWidth={2} /> Badges
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setShareStreakOpen(true);
                    }}
                    className="settings-glass flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl py-3 text-[11px] font-semibold text-ink transition active:scale-95"
                  >
                    <ArrowUpRight className="h-4 w-4 text-mute" strokeWidth={2} /> Share
                  </button>
                </div>

                <div className="pt-4 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-mute">Quick access</p>
                </div>
                <div className="space-y-3">
                  <WidgetSettings onMessage={showToast} />
                </div>

                {/* Section: Appearance */}
                <div className="pt-4 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-mute">
                    Appearance
                  </p>
                </div>
                <div className="settings-glass relative z-10 divide-y divide-[color:var(--hairline)] overflow-visible rounded-3xl">
                  <Row
                    label={<span className="text-sm font-medium text-ink">App Theme</span>}
                    action={
                      <div
                        className="theme-segmented-control"
                        style={{
                          "--theme-index": theme === "dark" ? 0 : theme === "amoled" ? 1 : 2,
                        } as React.CSSProperties}
                      >
                        <span className="theme-segmented-selection" aria-hidden="true" />
                        {[
                          { key: "dark" as const, label: "Dark" },
                          { key: "amoled" as const, label: "AMOLED" },
                          { key: "light" as const, label: "Light" },
                        ].map((opt) => {
                          const active = theme === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setTheme(opt.key);
                                if (typeof window !== "undefined") {
                                  try {
                                    localStorage.setItem("grain_app_theme", opt.key);
                                  } catch {}
                                }
                                if (userId) updateUserProfile(userId, { theme: opt.key });
                                try {
                                  navigator.vibrate?.(10);
                                } catch {}
                              }}
                              className={`theme-segmented-option ${
                                active
                                  ? "theme-segmented-option--active"
                                  : "text-mute hover:text-ink"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    }
                  />
                  <Row
                    label={
                      <div className="flex items-center gap-2">
                        <div
                          className="relative w-[32vw] max-w-[132px] shrink-0 aspect-[9/16] overflow-hidden rounded-[18px] border border-[color:var(--hairline-mid)] shadow-[0_8px_20px_rgba(0,0,0,0.24)]"
                          style={{ background: wallpaperThemeOf(wallpaperTheme, theme).bg }}
                          aria-hidden="true"
                        >
                          <img
                            src={appBackgroundImage}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/35" />
                          <div
                            className="absolute inset-x-[12%] top-[8%] h-px opacity-70"
                            style={{ backgroundColor: wallpaperThemeOf(wallpaperTheme, theme).fg }}
                          />
                          <div className="absolute inset-x-[12%] top-[13%] text-center text-[7px] font-bold tracking-[0.16em] opacity-80" style={{ color: wallpaperThemeOf(wallpaperTheme, theme).fg }}>
                            GRAIN
                          </div>
                          <div className={`absolute inset-x-[12%] grid gap-[3px] ${wallpaperGridStyle === "weeks" ? "top-[42%] grid-cols-7" : "top-[25%] aspect-[5/6] grid-cols-5 grid-rows-6"}`}>
                            {wallpaperGridStyle === "weeks" ? wallpaperSevenDays(displayedHeatmap, heatmapStartDate()).map(({ key, level, isToday }) => (
                              <span key={key} className="aspect-square rounded-[2px]" style={{ backgroundColor: gridColorOf(gridColorTheme).color, opacity: [0.2, 0.4, 0.7, 1][level] ?? 0.2, outline: isToday ? `1px solid ${wallpaperThemeOf(wallpaperTheme, theme).fg}` : undefined }} />
                            )) : Array.from({ length: 30 }, (_, index) => (
                              <span
                                key={index}
                                className="aspect-square rounded-[1px]"
                                style={{
                                  backgroundColor: gridColorOf(gridColorTheme).color,
                                  opacity: index % 5 === 0 ? 0.25 : index % 3 === 0 ? 0.55 : 0.9,
                                }}
                              />
                            ))}
                          </div>
                          <div
                            className="absolute inset-x-[12%] bottom-[10%] h-1.5 rounded-full opacity-75"
                            style={{ backgroundColor: wallpaperThemeOf(wallpaperTheme, theme).fg }}
                          />
                          <div
                            className="absolute bottom-[5%] left-[12%] right-[12%] h-px opacity-40"
                            style={{ backgroundColor: wallpaperThemeOf(wallpaperTheme, theme).fg }}
                          />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-ink block">Lock Screen</span>
                          <p className="text-[11px] text-mute">
                            {wallpaperGridStyle === "weeks" ? "7 days" : wallpaperGridStyle} · {gridColorTheme}
                          </p>
                        </div>
                      </div>
                    }
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setWallpaperEditorOpen(true);
                        }}
                        className="settings-control rounded-xl px-3 py-2 text-xs font-semibold text-ink transition active:scale-95"
                      >
                        Customize
                      </button>
                    }
                  />
                  <Row
                    label={
                      <span className="text-sm font-medium text-ink">Live wallpaper sync</span>
                    }
                    action={
                      <Toggle
                        checked={wallpaperSync}
                        onChange={toggleWallpaperSync}
                        ariaLabel="Toggle live wallpaper sync"
                      />
                    }
                  />
                  {Capacitor.isNativePlatform() && (
                    <Row
                      label={
                        <div>
                          <span className="text-sm font-medium text-ink block">Precise daily refresh</span>
                          <p className="text-[11px] text-mute">
                            {exactAlarmAllowed
                              ? "Updates static wallpaper shortly after midnight"
                              : "Allow Exact Alarms to prevent delayed daily updates"}
                          </p>
                        </div>
                      }
                      action={
                        exactAlarmAllowed ? (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-500">
                            On
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={requestExactAlarmPermission}
                            className="settings-control rounded-xl px-3 py-2 text-xs font-semibold text-ink transition active:scale-95"
                          >
                            Allow
                          </button>
                        )
                      }
                    />
                  )}
                  <Row
                    label={
                      <span className="text-sm font-medium text-ink">Date selector style</span>
                    }
                    action={
                      <div className="relative">
                        <button
                          onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                          className="flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink transition"
                        >
                          <span className="capitalize">{dateStyle}</span>
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {dateDropdownOpen && (
                          <div className="fixed inset-0 z-40" onClick={() => setDateDropdownOpen(false)} />
                        )}
                        <DropdownMotion
                          open={dateDropdownOpen}
                          className="absolute right-0 top-full mt-2 z-50 flex w-32 flex-col overflow-hidden rounded-xl border border-[color:var(--hairline-strong)] bg-canvas py-1 shadow-xl"
                        >
                              {["underline", "block", "mono"].map((styleOpt) => (
                                <button
                                  key={styleOpt}
                                  onClick={() => {
                                    setDateStyle(styleOpt as any);
                                    setDateDropdownOpen(false);
                                  }}
                                  className={`px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-ink/5 ${dateStyle === styleOpt ? "text-[color:var(--accent)] bg-ink/5" : "text-ink"}`}
                                >
                                  {styleOpt}
                                </button>
                              ))}
                        </DropdownMotion>
                      </div>
                    }
                  />
                </div>

                {/* Section: Reminders */}
                <div className="pt-5 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-mute">
                    Reminders
                  </p>
                </div>
                <div className="settings-glass divide-y divide-[color:var(--hairline)] overflow-hidden rounded-3xl">
                  <Row
                    label={
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Bell className="h-4 w-4 text-mute" /> Habit reminders
                      </span>
                    }
                    action={
                      <Toggle
                        checked={remindersOn}
                        onChange={async () => {
                          const next = !remindersOn;
                          if (next && !Capacitor.isNativePlatform()) {
                            showToast("Scheduled reminders are available in the Grain mobile app.");
                            return;
                          }
                          setRemindersOn(next);
                          if (userId) await updateUserProfile(userId, { remindersOn: next });
                          if (next) {
                            const granted = await requestNotificationPermission();
                            if (granted) {
                              showToast(`Reminders enabled for ${reminderTime}`);
                            } else {
                              setRemindersOn(false);
                              if (userId) await updateUserProfile(userId, { remindersOn: false });
                              showToast("Notification permission required");
                            }
                          } else {
                            showToast("Reminders turned off");
                          }
                        }}
                        ariaLabel="Toggle reminders"
                      />
                    }
                  />

                  {remindersOn && (
                    <div className="px-5 py-4 space-y-3 animate-fade-in">
                      <p className="text-xs text-mute leading-relaxed">Tap Done or +1 in a notification. Use each habit's own reminder time, or this default time. Remind me later snoozes for 15 minutes.</p>
                      {/* Time picker */}
                      {(() => {
                        const [hStr, mStr] = (reminderTime || "20:00").split(":");
                        const h24 = parseInt(hStr, 10);
                        const currentAmpm = h24 >= 12 ? "PM" : "AM";
                        const currentH12 = h24 % 12 === 0 ? 12 : h24 % 12;

                        const updateTime = (newH12: number, newMin: string, newAmpm: string) => {
                          let newH24 = newH12;
                          if (newAmpm === "PM" && newH12 < 12) newH24 += 12;
                          if (newAmpm === "AM" && newH12 === 12) newH24 = 0;
                          const timeStr = `${newH24.toString().padStart(2, "0")}:${newMin}`;
                          if (timeStr !== (reminderTime || "20:00")) {
                            setReminderTime(timeStr);
                            if (userId) updateUserProfile(userId, { reminderTime: timeStr });
                          }
                        };

                        const handleScroll = (
                          e: React.UIEvent<HTMLDivElement>,
                          callback: (index: number) => void,
                        ) => {
                          const target = e.currentTarget;
                          if (target.dataset.timeout) clearTimeout(Number(target.dataset.timeout));
                          target.dataset.timeout = setTimeout(() => {
                            const index = Math.round(target.scrollTop / 32);
                            callback(index);
                          }, 150).toString();
                        };

                        return (
                          <div className="relative flex justify-center h-32 border-y border-[color:var(--hairline)] overflow-hidden bg-canvas/30 mx-[-20px]">
                            <div className="absolute top-1/2 left-4 right-4 h-8 -mt-4 bg-transparent rounded-lg pointer-events-none" />
                            <div className="flex justify-center gap-4 w-full h-full [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
                              <div
                                className="flex flex-col overflow-y-auto scrollbar-none snap-y snap-mandatory py-[3rem] px-2 scroll-smooth"
                                ref={(el) => {
                                  if (el && !el.dataset.initialized) {
                                    el.scrollTop = (currentH12 - 1) * 32;
                                    el.dataset.initialized = "true";
                                  }
                                }}
                                onScroll={(e) =>
                                  handleScroll(e, (idx) =>
                                    updateTime(
                                      Math.min(12, Math.max(1, idx + 1)),
                                      mStr,
                                      currentAmpm,
                                    ),
                                  )
                                }
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                  <button
                                    key={`h-${h}`}
                                    type="button"
                                    onClick={() => updateTime(h, mStr, currentAmpm)}
                                    className="shrink-0 h-8 flex items-center justify-center text-lg font-bold snap-center"
                                  >
                                    <span
                                      className={`transition-all duration-200 ${currentH12 === h ? "text-ink scale-110" : "text-mute opacity-20"}`}
                                    >
                                      {h}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-col justify-center items-center font-bold text-ink text-lg opacity-40">
                                :
                              </div>
                              <div
                                className="flex flex-col overflow-y-auto scrollbar-none snap-y snap-mandatory py-[3rem] px-2 scroll-smooth"
                                ref={(el) => {
                                  if (el && !el.dataset.initialized) {
                                    el.scrollTop = parseInt(mStr, 10) * 32;
                                    el.dataset.initialized = "true";
                                  }
                                }}
                                onScroll={(e) =>
                                  handleScroll(e, (idx) =>
                                    updateTime(
                                      currentH12,
                                      Math.min(59, Math.max(0, idx)).toString().padStart(2, "0"),
                                      currentAmpm,
                                    ),
                                  )
                                }
                              >
                                {Array.from({ length: 60 }, (_, i) =>
                                  i.toString().padStart(2, "0"),
                                ).map((m) => (
                                  <button
                                    key={`m-${m}`}
                                    type="button"
                                    onClick={() => updateTime(currentH12, m, currentAmpm)}
                                    className="shrink-0 h-8 flex items-center justify-center text-lg font-bold snap-center"
                                  >
                                    <span
                                      className={`transition-all duration-200 ${mStr === m ? "text-ink scale-110" : "text-mute opacity-20"}`}
                                    >
                                      {m}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              <div className="w-3" />
                              <div
                                className="flex flex-col overflow-y-auto scrollbar-none snap-y snap-mandatory py-[3rem] px-2 scroll-smooth"
                                ref={(el) => {
                                  if (el && !el.dataset.initialized) {
                                    el.scrollTop = currentAmpm === "AM" ? 0 : 32;
                                    el.dataset.initialized = "true";
                                  }
                                }}
                                onScroll={(e) =>
                                  handleScroll(e, (idx) =>
                                    updateTime(currentH12, mStr, idx === 0 ? "AM" : "PM"),
                                  )
                                }
                              >
                                {["AM", "PM"].map((meridiem) => (
                                  <button
                                    key={meridiem}
                                    type="button"
                                    onClick={() => updateTime(currentH12, mStr, meridiem)}
                                    className="shrink-0 h-8 flex items-center justify-center text-sm font-bold snap-center"
                                  >
                                    <span
                                      className={`transition-all duration-200 ${currentAmpm === meridiem ? "text-ink scale-110" : "text-mute opacity-20"}`}
                                    >
                                      {meridiem}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-body">Daily summary</span>
                        <Toggle checked={dailySummary} ariaLabel="Toggle daily summary" onChange={() => {
                          const next = !dailySummary;
                          setDailySummary(next);
                          if (userId) void updateUserProfile(userId, { dailySummary: next });
                        }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-body">
                          <Sunrise className="h-3.5 w-3.5 text-amber-400" /> Morning kickoff (8 AM)
                        </span>
                        <Toggle
                          checked={morningKickoff}
                          onChange={() => {
                            const next = !morningKickoff;
                            setMorningKickoff(next);
                            if (userId) updateUserProfile(userId, { morningKickoff: next });
                            showToast(
                              next ? "Morning kickoff enabled" : "Morning kickoff disabled",
                            );
                          }}
                          ariaLabel="Toggle morning kickoff"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            navigator.vibrate?.(15);
                          } catch {}
                          showToast("Sending a test notification...");
                          const ok = await sendTestNotification();
                          if (!ok)
                            showToast("Please allow notification permission in system settings");
                        }}
                        className="w-full flex items-center justify-between py-3 group hover:bg-ink/4 transition"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-ink">
                          <Sparkles className="h-4 w-4 text-emerald-400" /> Send Test Notification
                        </span>
                        <ArrowRight className="h-4 w-4 text-mute group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Section: More */}
                <div className="pt-5 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-mute">More</p>
                </div>
                <div className="settings-glass divide-y divide-[color:var(--hairline)] overflow-hidden rounded-3xl">
                  <button
                    data-lg-press
                    onClick={() => {
                      setSettingsOpen(false);
                      setOnboardingOpen(true);
                    }}
                    className="flex w-full items-center justify-between px-5 py-3.5 group hover:bg-ink/4 active:scale-[0.99] transition"
                  >
                    <span className="text-sm font-medium text-ink">
                      Starter Packs & Walkthrough
                    </span>
                    <ArrowRight className="h-4 w-4 text-mute group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    data-lg-press
                    onClick={() => setFeedbackOpen(true)}
                    className="flex w-full items-center justify-between px-5 py-3.5 group hover:bg-ink/4 active:scale-[0.99] transition"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <MessageSquareHeart className="h-4 w-4 text-mute" /> Feedback
                    </span>
                    <ArrowRight className="h-4 w-4 text-mute group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    data-lg-press
                    onClick={exportBackup}
                    className="flex w-full items-center justify-between px-5 py-3.5 group hover:bg-ink/4 active:scale-[0.99] transition"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <Download className="h-4 w-4 text-mute" /> Export data
                    </span>
                    <ArrowRight className="h-4 w-4 text-mute group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    data-lg-press
                    onClick={() => backupInputRef.current?.click()}
                    className="flex w-full items-center justify-between px-5 py-3.5 group hover:bg-ink/4 active:scale-[0.99] transition"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <Download className="h-4 w-4 rotate-180 text-mute" /> Import backup
                    </span>
                    <ArrowRight className="h-4 w-4 text-mute group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <div className="mx-5 mb-2 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-3 text-[11px] leading-relaxed text-body">
                    <strong className="text-ink">Local data only.</strong> Your account remains online, but habits and progress stay on this device. Download a backup before uninstalling or changing phones.
                    <span className="mt-1.5 block text-mute">
                      {backupStatus?.lastExportedAt
                        ? `Last backup: ${new Date(backupStatus.lastExportedAt).toLocaleDateString()}`
                        : "No backup created yet."}
                    </span>
                  </div>
                  <button
                    data-lg-press
                    onClick={() => setResetConfirmOpen(true)}
                    className="flex w-full items-center justify-between px-5 py-3.5 group hover:bg-ink/4 active:scale-[0.99] transition"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <RotateCcw className="h-4 w-4 text-mute" /> Reset today
                    </span>
                    <ArrowRight className="h-4 w-4 text-mute group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="py-4">
                  <button
                    data-lg-press
                    onClick={() => setSignOutOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>

                <p className="pb-2 text-center text-[10px] leading-relaxed text-mute">
                  Grain · © 2026 Ronit Sharma · All rights reserved
                </p>

                <div className="pb-8" />
              </div>
            </div>
          )}

          {bulkDeleteConfirmOpen && (
            <ConfirmDialog
              onClose={() => setBulkDeleteConfirmOpen(false)}
              icon={<Trash2 className="h-5 w-5 text-red-500" />}
              title={`Delete ${selectedHabitIds.size} habit${selectedHabitIds.size > 1 ? "s" : ""}?`}
              description={`This will permanently remove ${selectedHabitIds.size === 1 ? "this habit" : "these habits"} and reset ${selectedHabitIds.size === 1 ? "its" : "their"} streak history.`}
              confirmLabel={`Delete (${selectedHabitIds.size})`}
              destructive
              onConfirm={async () => {
                try {
                  navigator.vibrate?.([30, 80, 50]);
                } catch {}
                const idsToDelete = Array.from(selectedHabitIds);
                setBulkDeleteConfirmOpen(false);
                setIsSelectionMode(false);
                setSelectedHabitIds(new Set());

                try {
                  const removedDocs = await removeManyHabits(idsToDelete);
                  showToast(
                    `Deleted ${removedDocs.length} habit${removedDocs.length > 1 ? "s" : ""}`,
                    {
                      label: "Undo",
                      onClick: async () => {
                        try {
                          navigator.vibrate?.(10);
                        } catch {}
                        for (const doc of removedDocs) {
                          await restoreHabitDoc(doc);
                        }
                        showToast(
                          `Restored ${removedDocs.length} habit${removedDocs.length > 1 ? "s" : ""}`,
                        );
                      },
                    },
                    6000,
                  );
                } catch (err) {
                  toastError("Bulk delete failed");
                  showToast("Failed to delete habits. Please try again.");
                }
              }}
            />
          )}

          {signOutOpen && (
            <ConfirmDialog
              onClose={() => setSignOutOpen(false)}
              icon={<LogOut className="h-5 w-5" />}
              title="Sign out?"
              description="You'll be signed out of your Grain account. Your data remains safely stored in the cloud."
              confirmLabel="Sign out"
              destructive
              onConfirm={() => {
                try {
                  navigator.vibrate?.(18);
                } catch {}
                try {
                  localStorage.removeItem("grain_onboarded");
                  sessionStorage.removeItem("grain_onboarded");
                } catch {}
                signOut();
              }}
            />
          )}

          {resetConfirmOpen && (
            <ConfirmDialog
              onClose={() => setResetConfirmOpen(false)}
              icon={<RotateCcw className="h-5 w-5" />}
              title="Reset today?"
              description="Clears today's completions and progress. Streaks roll back by one for anything already marked done."
              confirmLabel="Reset today"
              destructive
              onConfirm={() => {
                resetToday();
                setSettingsOpen(false);
              }}
            />
          )}

          {profileEditOpen && (
            <ProfileEditSheet
              profile={profile}
              onClose={closeProfileEdit}
              onSave={(next) => {
                requestOverlayClose(closeProfileEdit, () => {
                  saveProfile(next).catch((err) => toastError("An error occurred"));
                });
              }}
            />
          )}

          {feedbackOpen && (
            <Suspense fallback={null}>
              <FeedbackSheet
                onClose={() => setFeedbackOpen(false)}
                userId={userId}
                userEmail={profile.email}
                userName={profile.name}
                onToast={showToast}
              />
            </Suspense>
          )}

          {/* Dedicated Full-Screen Wallpaper Customizer Modal */}
          {wallpaperEditorOpen && (
            <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-fade-in-up select-none">
              {/* Controls overlay at top of Full Screen Preview */}
              <div className="absolute top-[env(safe-area-inset-top,24px)] mt-3 left-0 right-0 flex items-center justify-between px-4 z-50 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.vibrate?.(10);
                      } catch {}
                      setWallpaperEditorOpen(false);
                      setIsRepositionMode(false);
                      setIsMovingPhoto(false);
                    }}
                    className="wallpaper-glass-control flex h-9 w-9 items-center justify-center rounded-full text-white active:scale-95"
                    aria-label="Close wallpaper customizer"
                  >
                    <X size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="wallpaper-glass-control flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/85 active:scale-95"
                    aria-label="Upload custom wallpaper photo"
                  >
                    <ImagePlus size={16} />
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <button
                    type="button"
                    onClick={() => setWallpaperActionMenuOpen((open) => !open)}
                    className="wallpaper-glass-control absolute right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/85 active:scale-95"
                    aria-label="Wallpaper actions"
                  >
                    <MoreVertical size={18} />
                  </button>

                  <DropdownMotion open={wallpaperActionMenuOpen} className="wallpaper-glass-panel absolute right-4 top-11 w-44 overflow-hidden rounded-2xl p-1.5 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setWallpaperOffset({ x: 0, y: 0 });
                        setWallpaperScale(1);
                        setWallpaperPhotoOffset({ x: 0, y: 0 });
                        setWallpaperPhotoScale(1);
                        setWallpaperActionMenuOpen(false);
                        showToast("Crop and position reset");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-white hover:bg-white/10"
                    >
                      <RotateCcw size={14} /> Reset framing
                    </button>
                  </DropdownMotion>
                </div>
              </div>

              {/* Live Wallpaper Scene (Fills the entire screen) */}
              <div
                key={syncPulse}
                ref={previewRef}
                className={`wp-scene absolute inset-0 flex flex-col items-center justify-center ${syncPulse ? "animate-sync-pulse" : ""}`}
                style={{
                  background: wallpaperThemeOf(wallpaperTheme, theme).bg,
                  ["--ink" as string]: wallpaperThemeOf(wallpaperTheme, theme).bg,
                  ["--on-ink" as string]: wallpaperThemeOf(wallpaperTheme, theme).fg,
                  ["--wp-bg" as string]: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).bg,
                  ["--wp-fg" as string]: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).fg,
                  ["--wp-accent" as string]: wallpaperTokens(wallpaperTheme, gridColorTheme, theme)
                    .accent,
                  ["--wp-empty" as string]: wallpaperTokens(wallpaperTheme, gridColorTheme, theme)
                    .empty,
                  ["--wp-low" as string]: wallpaperTokens(wallpaperTheme, gridColorTheme, theme)
                    .low,
                  ["--wp-mid" as string]: wallpaperTokens(wallpaperTheme, gridColorTheme, theme)
                    .mid,
                  ["--wp-hi" as string]: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).hi,
                  color: wallpaperThemeOf(wallpaperTheme, theme).fg,
                }}
              >
                {/* Snapping Crosshairs */}
                {isDraggingWallpaper &&
                  isRepositionMode &&
                  (wallpaperGridStyle === "month" ||
                    wallpaperGridStyle === "year" ||
                    wallpaperGridStyle === "weeks" ||
                    wallpaperGridStyle === "widget") && (
                    <>
                      <div
                        className={`absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 z-0 transition-colors duration-200 ${wallpaperOffset.x === 0 ? "bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-white/20"}`}
                      />
                      <div
                        className={`absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 z-0 transition-colors duration-200 ${wallpaperOffset.y === 0 ? "bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-white/20"}`}
                      />
                    </>
                  )}
                {wallpaperTheme === "custom" && wallpaperCustomPhoto && (
                  <>
                    <img
                      ref={wallpaperPhotoRef}
                      src={wallpaperCustomPhoto}
                      className={`absolute inset-0 h-full w-full object-contain pointer-events-none ${isMovingPhoto ? "" : "transition-transform"}`}
                      style={{
                        transform: `translate(${wallpaperPhotoOffset.x}px, ${wallpaperPhotoOffset.y}px) scale(${wallpaperPhotoScale})`,
                      }}
                      alt=""
                    />
                    <div
                      className="absolute inset-0 pointer-events-none bg-black transition-opacity"
                      style={{ opacity: wallpaperPhotoOverlay }}
                    />
                  </>
                )}
                {showGridGestureHint && !isMovingPhoto && !isRepositionMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowGridGestureHint(false);
                      try {
                        localStorage.setItem("grain_grid_gesture_learned", "true");
                      } catch {}
                    }}
                    className="wallpaper-glass-hint absolute left-1/2 top-[calc(env(safe-area-inset-top,24px)+76px)] z-40 -translate-x-1/2 whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
                  >
                    Drag the grid to move · Pinch to resize · Tap to dismiss
                  </button>
                )}
                {/* Overlay hint */}
                {(isRepositionMode || isMovingPhoto) && (
                  <div className="absolute top-[env(safe-area-inset-top,24px)] mt-24 left-0 right-0 flex justify-center pointer-events-none z-40 animate-fade-in">
                    <span className="wallpaper-glass-hint px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white">
                      {isMovingPhoto
                        ? "Drag to reposition photo · Pinch to resize"
                        : "Drag to reposition grid · Pinch to resize"}
                    </span>
                  </div>
                )}
                {isMovingPhoto && (
                  <div className="pointer-events-none absolute inset-3 z-30 border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.14)]">
                    <span className="absolute top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.18em] text-white/85">
                      Wallpaper crop
                    </span>
                  </div>
                )}
                {/* Draggable container */}
                <div
                  ref={wallpaperGridRef}
                  className={`relative h-full w-full flex flex-col items-center justify-center ${
                    "cursor-move pointer-events-auto"
                  }`}
                  style={{
                    transform: `translate(${wallpaperOffset.x}px, ${wallpaperOffset.y}px) scale(${wallpaperScale})`,
                    touchAction: "none",
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheel}
                >
                  {wallpaperGridStyle === "year" ? (
                    /* ── Year Calendar View ── */
                    (() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const months = Array.from({ length: 12 }, (_, m) => {
                        const monthName = new Date(year, m, 1).toLocaleString("default", {
                          month: "short",
                        });
                        const daysInMonth = new Date(year, m + 1, 0).getDate();
                        const firstDow = (new Date(year, m, 1).getDay() + 6) % 7; // 0=Mon
                        return { m, monthName, daysInMonth, firstDow };
                      });
                      const totalDays =
                        new Date(year, 12, 0).getDate() + new Date(year, 0, 1).getDay();
                      const daysInYear =
                        year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
                      const dayOfYear =
                        Math.floor((today.getTime() - new Date(year, 0, 1).getTime()) / 86400000) +
                        1;
                      const daysLeft = daysInYear - dayOfYear;
                      const pct = Math.round((dayOfYear / daysInYear) * 100);
                      const themeColors = wallpaperTokens(wallpaperTheme, gridColorTheme, theme);

                      // Build a per-day completion map from heatmap
                      const startDate = heatmapStartDate(today);
                      const completionMap = new Map<string, number>();
                      displayedHeatmap.forEach((col, ci) => {
                        col.forEach((v, ri) => {
                          const d = new Date(startDate);
                          d.setDate(startDate.getDate() + ci * 7 + ri);
                          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                          completionMap.set(key, v);
                        });
                      });

                      return (
                        <div className="w-full flex flex-col items-center justify-center -mt-8">
                          <div
                            className="grid gap-x-6 gap-y-7"
                            style={{
                              gridTemplateColumns: "repeat(3, max-content)",
                              justifyContent: "center",
                            }}
                          >
                            {months.map(({ m, monthName, daysInMonth, firstDow }) => {
                              const cells = [];
                              for (let e = 0; e < firstDow; e++) {
                                cells.push(<div key={`e-${e}`} style={{ width: 8, height: 8 }} />);
                              }
                              for (let d = 1; d <= daysInMonth; d++) {
                                const isToday =
                                  today.getFullYear() === year &&
                                  today.getMonth() === m &&
                                  today.getDate() === d;
                                const isFuture = new Date(year, m, d) > today;
                                const key = `${year}-${m}-${d}`;
                                const v = completionMap.get(key) ?? 0;
                                let bg: string;
                                if (isFuture) {
                                  bg = "rgba(255,255,255,0.04)";
                                } else {
                                  bg =
                                    v === 0
                                      ? themeColors.empty
                                      : v === 1
                                        ? themeColors.low
                                        : v === 2
                                          ? themeColors.mid
                                          : themeColors.hi;
                                }
                                cells.push(
                                  <div
                                    key={d}
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 2,
                                      background: bg,
                                      border: isToday
                                        ? `1px solid ${themeColors.accent}`
                                        : undefined,
                                      boxShadow: isToday
                                        ? `0 0 6px ${themeColors.accent}`
                                        : undefined,
                                      flexShrink: 0,
                                    }}
                                  />,
                                );
                              }
                              return (
                                <div key={m} className="flex flex-col gap-1.5">
                                  <span
                                    style={{
                                      fontSize: 9,
                                      opacity: 0.55,
                                      letterSpacing: "0.02em",
                                      fontWeight: 500,
                                      textTransform: "capitalize",
                                      paddingLeft: 1,
                                    }}
                                  >
                                    {monthName}
                                  </span>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(7, 8px)",
                                      gap: 3,
                                    }}
                                  >
                                    {cells}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  ) : wallpaperGridStyle === "month" ? (
                    /* ── Month Calendar View ── */
                    (() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = today.getMonth();
                      const monthName = today
                        .toLocaleString("default", { month: "long" })
                        .toUpperCase();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon
                      const fg = wallpaperThemeOf(wallpaperTheme, theme).fg;
                      const themeColors = wallpaperTokens(wallpaperTheme, gridColorTheme, theme);

                      // Build completion map
                      const startDate = heatmapStartDate(today);
                      const completionMap = new Map<string, number>();
                      displayedHeatmap.forEach((col, ci) => {
                        col.forEach((v, ri) => {
                          const d = new Date(startDate);
                          d.setDate(startDate.getDate() + ci * 7 + ri);
                          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                          completionMap.set(key, v);
                        });
                      });

                      // Build calendar cells (leading blanks + day cells)
                      const totalCells = firstDow + daysInMonth;
                      const rows = Math.ceil(totalCells / 7);
                      const cells: {
                        day: number | null;
                        isToday: boolean;
                        isFuture: boolean;
                        v: number;
                      }[] = [];
                      for (let i = 0; i < rows * 7; i++) {
                        const dayNum = i - firstDow + 1;
                        if (dayNum < 1 || dayNum > daysInMonth) {
                          cells.push({ day: null, isToday: false, isFuture: false, v: 0 });
                        } else {
                          const isToday = today.getDate() === dayNum;
                          const isFuture = new Date(year, month, dayNum) > today;
                          const key = `${year}-${month}-${dayNum}`;
                          const v = completionMap.get(key) ?? 0;
                          cells.push({ day: dayNum, isToday, isFuture, v });
                        }
                      }

                      const DAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
                      const CELL_SIZE = 42;
                      const GAP = 2;

                      return (
                        <div className="w-full flex flex-col items-center justify-center -mt-6">
                          <div
                            className="flex flex-col items-center"
                            style={{ width: "max-content" }}
                          >
                            {/* Month name */}
                            <div
                              className="text-center mb-6"
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                letterSpacing: "0.25em",
                                color: fg,
                                opacity: 0.8,
                              }}
                            >
                              {monthName}
                            </div>

                            {/* Day headers */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`,
                                gap: `${GAP}px`,
                                marginBottom: 8,
                              }}
                            >
                              {DAY_HEADERS.map((h) => (
                                <div
                                  key={h}
                                  style={{
                                    textAlign: "center",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: "0.05em",
                                    color: fg,
                                    opacity: 0.45,
                                  }}
                                >
                                  {h}
                                </div>
                              ))}
                            </div>

                            {/* Day grid */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`,
                                gap: `${GAP}px`,
                              }}
                            >
                              {cells.map((cell, idx) => {
                                if (cell.day === null) {
                                  return (
                                    <div
                                      key={idx}
                                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                                    />
                                  );
                                }
                                const textOpacity = cell.isFuture ? 0.25 : cell.isToday ? 1 : 0.85;

                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      width: CELL_SIZE,
                                      height: CELL_SIZE,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      position: "relative",
                                    }}
                                  >
                                    {/* Today circle ring */}
                                    {cell.isToday && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          inset: 3,
                                          borderRadius: "50%",
                                          border: `1.5px solid ${themeColors.accent}`,
                                          opacity: 0.9,
                                          pointerEvents: "none",
                                        }}
                                      />
                                    )}

                                    {/* Day number - fixed vertical center across all days */}
                                    <span
                                      style={{
                                        fontSize: 15,
                                        fontWeight: cell.isToday ? 700 : 400,
                                        color: fg,
                                        opacity: textOpacity,
                                        lineHeight: 1,
                                        fontVariantNumeric: "tabular-nums",
                                      }}
                                    >
                                      {cell.day}
                                    </span>

                                    {/* Completion dot - absolute bottom position to prevent baseline shifts */}
                                    {!cell.isFuture && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          bottom: 5,
                                          left: "50%",
                                          transform: "translateX(-50%)",
                                          width: 4,
                                          height: 4,
                                          borderRadius: "50%",
                                          background: cell.isToday
                                            ? themeColors.accent
                                            : cell.v === 0
                                              ? themeColors.empty
                                              : cell.v === 1
                                                ? themeColors.low
                                                : cell.v === 2
                                                  ? themeColors.mid
                                                  : themeColors.hi,
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : wallpaperGridStyle === "weeks" ? (
                    <div className={`mt-6 flex flex-col items-center gap-5 ${wallpaperSync ? "" : "opacity-60"}`} aria-label="Last seven days of progress">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-60">Last 7 days</p>
                      <div className="flex gap-2">
                        {wallpaperSevenDays(displayedHeatmap, heatmapStartDate()).map(({ date, key, level, isToday }) => (
                          <div key={key} className="flex w-9 flex-col items-center gap-2" aria-label={`${date.toLocaleDateString()}: progress level ${level}${isToday ? ", today" : ""}`}>
                            <span className="text-[10px] font-semibold opacity-60">{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                            <div className={`grid h-9 w-9 place-items-center rounded-xl text-[12px] font-bold ${isToday ? "ring-2 ring-[color:var(--wp-accent)]" : ""}`} style={{ background: ["var(--wp-empty)", "var(--wp-low)", "var(--wp-mid)", "var(--wp-hi)"][level] ?? "var(--wp-empty)" }}>{date.getDate()}</div>
                            <span className="h-3 text-[8px] font-bold uppercase tracking-wider">{isToday ? "Today" : ""}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] opacity-60"><span>Less</span>{["empty", "low", "mid", "hi"].map(level => <span key={level} className="h-2 w-2 rounded-sm" style={{ background: `var(--wp-${level})` }} />)}<span>More</span></div>
                    </div>
                  ) : wallpaperGridStyle === "widget" ? (
                    /* ── Frosted Liquid-Glass Widget Card ── */
                    <div
                      className={`w-full max-w-[320px] mx-auto rounded-[28px] p-5 backdrop-blur-2xl border shadow-2xl flex flex-col gap-3.5 mt-8 ${wallpaperSync ? "" : "opacity-60"}`}
                      style={{
                        background: "color-mix(in srgb, var(--wp-bg) 65%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--wp-accent) 25%, rgba(255, 255, 255, 0.12))",
                        boxShadow:
                          "0 20px 45px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)",
                      }}
                    >
                      {/* Widget Header: Streak Flame + Completion Rate */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5 font-bold text-[13px] tracking-tight">
                          <Flame className="w-4 h-4 text-[color:var(--wp-accent)]" />
                          <span>{displayedTotalStreak}d Streak</span>
                        </div>
                        <div
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{
                            background: "color-mix(in srgb, var(--wp-accent) 18%, transparent)",
                            color: "var(--wp-accent)",
                          }}
                        >
                          {displayedRate}% Done
                        </div>
                      </div>

                      <div
                        className="h-px w-full"
                        style={{ background: "color-mix(in srgb, var(--wp-fg) 10%, transparent)" }}
                      />

                      {/* Widget Mini Heatmap Grid (7 columns × min(previewWeeks, 12) rows) */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-1.5" style={{ gap: "3px" }}>
                          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                            <div
                              key={i}
                              className="w-[14px] text-[9px] font-bold text-center opacity-40 uppercase"
                            >
                              {d}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col" style={{ gap: "3px" }}>
                          {displayedHeatmap.slice(-Math.min(previewWeeks, 12)).map((col, ci) => {
                            const absCi = 52 - Math.min(previewWeeks, 12) + ci;

                            return (
                              <div key={ci} className="flex items-center" style={{ gap: "3px" }}>
                                {col.map((v, ri) => {
                                  const isToday = absCi === todayCol && ri === todayRow;
                                  const isFuture = absCi === todayCol && ri > todayRow;

                                  return (
                                    <div
                                      key={`${ci}-${ri}`}
                                      className={`relative ${isToday ? "animate-cell-flash ring-1.5 ring-inset ring-[color:var(--wp-accent)]" : ""}`}
                                      style={{
                                        width: "14px",
                                        height: "14px",
                                        borderRadius: "3px",
                                        background: isFuture
                                          ? "color-mix(in srgb, var(--wp-empty) 40%, transparent)"
                                          : v === 0
                                            ? "var(--wp-empty)"
                                            : v === 1
                                              ? "var(--wp-low)"
                                              : v === 2
                                                ? "var(--wp-mid)"
                                                : "var(--wp-hi)",
                                        opacity: isFuture ? 0.3 : 1,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        className="h-px w-full"
                        style={{ background: "color-mix(in srgb, var(--wp-fg) 10%, transparent)" }}
                      />

                      {/* Widget Habit Footer */}
                      <div className="flex items-center justify-center gap-2 text-[10px] font-semibold tracking-wider uppercase opacity-75 px-1 truncate">
                        {topHabitNames.map((name, i) => (
                          <span key={i} className="flex items-center gap-2">
                            {i > 0 && <span className="opacity-40">·</span>}
                            <span className="truncate">{name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* ── Stacked Goals View ── */
                    <div
                      className={`flex flex-col items-center gap-12 mt-16 w-full ${wallpaperSync ? "" : "opacity-60"}`}
                    >
                      {stackedGoals.length === 0 ? (
                        <div className="text-[14px] opacity-50 font-semibold uppercase tracking-widest text-center mt-20">
                          No active goals
                        </div>
                      ) : (
                        stackedGoals.map((sg) => (
                          <div key={sg.id} className="flex flex-col items-center w-full">
                            <div
                              className="grid grid-cols-7 gap-1 justify-center px-4 mb-4 mx-auto"
                              aria-label={`${sg.title} goal progress`}
                            >
                              {sg.boxes &&
                                sg.boxes.map((v: number, i: number) => (
                                  <div
                                    key={i}
                                    className="h-2 w-2 rounded-[2px] transition-colors"
                                    style={{
                                      background:
                                        v === 0
                                          ? "rgba(255, 255, 255, 0.08)"
                                          : v === 1
                                            ? "var(--wp-low)"
                                            : v === 2
                                              ? "var(--wp-mid)"
                                              : "var(--wp-hi)",
                                    }}
                                  />
                                ))}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[12px] uppercase tracking-widest font-bold opacity-80">
                                {sg.title}
                              </span>
                              <span
                                style={{
                                  color: "rgba(255, 255, 255, 0.5)",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                {sg.currentStreak}d left - {sg.completionRate}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {wallpaperHabitSet !== "none" && (
                    <div
                      className={`mt-8 flex flex-col gap-1.5 opacity-80 w-full px-12 ${
                        wallpaperStatsAlign === "left"
                          ? "items-start text-left"
                          : wallpaperStatsAlign === "right"
                            ? "items-end text-right"
                            : "items-center text-center"
                      }`}
                    >
                      {(HABIT_SETS.find((s) => s.key === wallpaperHabitSet)?.habits || []).map(
                        (h, i) => (
                          <span
                            key={i}
                            className="text-[12px] uppercase tracking-widest font-semibold"
                          >
                            {h}
                          </span>
                        ),
                      )}
                    </div>
                  )}

                  {wallpaperGridStyle !== "widget" && (
                    <div
                      className={`mt-6 w-full px-12 text-[11px] font-semibold opacity-70 ${wallpaperStatsAlign === "left" ? "text-left" : wallpaperStatsAlign === "right" ? "text-right" : "text-center"}`}
                    >
                      {activeGoalId && goals.some((g) => g.id === activeGoalId) ? (
                        <span className="opacity-80 font-bold tracking-wide text-[11px]">
                          {displayedTotalStreak}d left - {displayedRate}%
                        </span>
                      ) : (
                        <span>
                          {displayedTotalStreak} day streak · {displayedRate}%
                        </span>
                      )}
                      <br />
                      <span className="opacity-50 mt-1 block">
                        {wallpaperSync ? "LIVE SYNC ON" : "SNAPSHOT PAUSED"}
                      </span>
                    </div>
                  )}
                </div>{" "}
                {/* End Draggable Container */}
              </div>

              <WallpaperEditorControls
                editingPhoto={isMovingPhoto}
                editingGrid={isRepositionMode}
                customPhoto={wallpaperTheme === "custom"}
                expanded={wallpaperMenuExpanded}
                settings={renderSettingsMenu()}
                onFinishEditing={() => {
                  setIsMovingPhoto(false);
                  setIsRepositionMode(false);
                }}
                onToggleExpanded={() => setWallpaperMenuExpanded((expanded) => !expanded)}
                onAdjustCrop={() => {
                  setIsRepositionMode(false);
                  setIsMovingPhoto(true);
                }}
                onApplyLive={() => applyWallpaper(false)}
                onSetStatic={() => setShowStaticTargetSelector(true)}
              />
            </div>
          )}

          {streakOpen && (
            <SheetShell
              onClose={closeStreak}
              title={`${totalStreak}-day streak`}
              subtitle="Overview"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">
                      {totalStreak}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-body">Current</p>
                  </div>
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">
                      {bestStreak || "—"}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-body">Best</p>
                  </div>
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{rate}%</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-body">Rate</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-medium text-body">Last 7 days</p>
                  <div className="flex gap-1.5">
                    {heatmap.slice(-7).map((col, i) => {
                      const v = col[todayRow];
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-lg py-4 text-center text-[9px] font-semibold"
                          style={{
                            background:
                              v === 0
                                ? "var(--canvas-softer)"
                                : v === 1
                                  ? "color-mix(in oklab, var(--ink) 25%, transparent)"
                                  : v === 2
                                    ? "color-mix(in oklab, var(--ink) 55%, transparent)"
                                    : "var(--ink)",
                            color: v >= 2 ? "var(--on-ink)" : "var(--body)",
                          }}
                        >
                          {["M", "T", "W", "T", "F", "S", "S"][i]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  data-lg-press
                  onClick={async () => {
                    // Freeze streak for every non-done habit today
                    for (const h of flatHabits) {
                      if (!completions[h.id]?.frozenStreak) {
                        await freezeHabitStreak(h.id);
                      }
                    }
                    showToast("All streaks frozen for today");
                    requestOverlayClose(closeStreak);
                  }}
                  className="pill w-full bg-canvas-soft py-3 text-[13px] font-semibold text-ink"
                >
                  <Snowflake className="mr-1.5 inline h-3.5 w-3.5" /> Freeze today's streak
                </button>
                <button
                  onClick={() => requestOverlayClose(closeStreak)}
                  className="btn-primary-uber w-full py-3 text-sm"
                >
                  Done
                </button>
              </div>
            </SheetShell>
          )}

          {editHabitTarget &&
            (() => {
              const t = editHabitTarget;
              const h = habits[t.q]?.[t.i];
              if (!h) return null;
              return (
                <EditHabitSheet
                  habit={h}
                  quadrant={t.q}
                  onClose={closeEditHabit}
                  onSave={(patch, newQ) => {
                    requestOverlayClose(closeEditHabit, () => {
                      void (async () => {
                        try {
                          const updates: Partial<Omit<HabitDoc, "id" | "createdAt">> = { ...patch };
                          if (newQ && newQ !== t.q) updates.quadrant = newQ;
                          await updateHabitDoc(h.id, updates);
                          showToast("Habit updated");
                        } catch {
                          toastError("Failed to update habit");
                        }
                      })();
                    });
                  }}
                  onDelete={() => {
                    requestOverlayClose(closeEditHabit, () => deleteHabit(t.q, t.i));
                  }}
                />
              );
            })()}

          {/* Modal */}
          {modalOpen && (
            <SheetShell
              onClose={closeCreateHabit}
              title="Create habit"
              subtitle="Build something you'll be proud of."
            >
              <div className="space-y-4">
                <Field label="Habit name">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Morning run"
                    className="w-full rounded-2xl liquid-input px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                  />
                </Field>

                <Field label="Priority quadrant">
                  <div className="grid grid-cols-2 gap-2">
                    {QUADRANT_ORDER.map((q) => {
                      const active = selectedQuadrant === q;
                      return (
                        <button
                          key={q}
                          onClick={() => setSelectedQuadrant(q)}
                          className={`pill px-3 py-2.5 text-left text-xs font-medium transition ${
                            active
                              ? "bg-ink text-on-ink"
                              : "liquid-input text-ink hover:bg-[color:var(--surface-pressed)]"
                          }`}
                        >
                          {QUADRANTS[q].title}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Category">
                  <HabitCategoryDraftPicker draft={newCategory} />
                </Field>

                <Field label="Time of day">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { key: "any", label: "Anytime" },
                        { key: "morning", label: "Morning" },
                        { key: "afternoon", label: "Afternoon" },
                        { key: "evening", label: "Evening" },
                      ] as const
                    ).map((t) => {
                      const active = (newTime ?? "any") === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() =>
                            setNewTime(t.key === "any" ? undefined : (t.key as Habit["time"]))
                          }
                          className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                            active ? "bg-ink text-on-ink" : "liquid-input text-ink"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Customize Toggle */}
                <button
                  type="button"
                  onClick={() => setShowCustomize(!showCustomize)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-semibold text-mute transition hover:text-ink hover:bg-[color:var(--canvas-soft)]"
                >
                  <span>Customize</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${showCustomize ? "rotate-180" : ""}`}
                  />
                </button>

                <CollapseMotion open={showCustomize}>
                  <div className="space-y-4 pt-1">
                    <Field label="Type">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setNewIsNumeric(false)}
                          className={`pill px-3 py-2.5 text-xs font-medium transition ${
                            !newIsNumeric ? "bg-ink text-on-ink" : "liquid-input text-ink"
                          }`}
                        >
                          Binary
                        </button>
                        <button
                          onClick={() => setNewIsNumeric(true)}
                          className={`pill px-3 py-2.5 text-xs font-medium transition ${
                            newIsNumeric ? "bg-ink text-on-ink" : "liquid-input text-ink"
                          }`}
                        >
                          Numeric
                        </button>
                      </div>
                    </Field>

                    {newIsNumeric && (
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Target">
                          <input
                            type="number"
                            value={newTarget}
                            min={0}
                            step="0.25"
                            onChange={(e) => setNewTarget(Number(e.target.value) || 0)}
                            className="w-full rounded-2xl liquid-input px-4 py-3 text-sm text-ink outline-none focus:bg-[color:var(--canvas-softer)]"
                          />
                        </Field>
                        <Field label="Unit">
                          <input
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            placeholder="pages, min…"
                            className="w-full rounded-2xl liquid-input px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                          />
                        </Field>
                      </div>
                    )}

                    <Field label="Frequency">
                      <div className="flex gap-2">
                        {["Daily", "Weekdays", "Custom"].map((f) => {
                          const active = newFreq === f;
                          return (
                            <button
                              key={f}
                              onClick={() => setNewFreq(f)}
                              className={`pill flex-1 px-3 py-2 text-xs font-medium transition ${
                                active
                                  ? "bg-ink text-on-ink"
                                  : "liquid-input text-ink hover:bg-[color:var(--surface-pressed)]"
                              }`}
                            >
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    {newFreq === "Custom" && (
                      <Field label="Repeat on">
                        <div className="grid grid-cols-7 gap-1.5">
                          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
                            const active = newCustomDays.includes(index);
                            return (
                              <button
                                key={`${day}-${index}`}
                                type="button"
                                aria-label={`Repeat on ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]}`}
                                onClick={() =>
                                  setNewCustomDays((days) =>
                                    active ? days.filter((d) => d !== index) : [...days, index],
                                  )
                                }
                                className={`h-8 rounded-full text-[11px] font-bold ${active ? "bg-ink text-on-ink" : "liquid-input text-mute"}`}
                                aria-pressed={active}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </Field>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Shade">
                        <div className="flex gap-1.5">
                          {[
                            "var(--ink)",
                            "color-mix(in oklab, var(--ink) 70%, transparent)",
                            "color-mix(in oklab, var(--ink) 40%, transparent)",
                            "var(--canvas-soft)",
                            "var(--surface-pressed)",
                          ].map((c, i) => (
                            <button
                              key={i}
                              onClick={() => setNewShade(i)}
                              aria-label={`Choose habit shade ${i + 1}`}
                              style={{ background: c }}
                              className={`h-8 w-8 rounded-full border border-[color:var(--hairline)] transition ${
                                i === newShade
                                  ? "ring-2 ring-ink ring-offset-2 ring-offset-[color:var(--canvas)]"
                                  : ""
                              }`}
                            />
                          ))}
                        </div>
                      </Field>
                      <Field label="Icon">
                        <div className="flex gap-1.5">
                          {[Flame, Sparkles, Zap, Clock].map((I, i) => (
                            <button
                              key={i}
                              onClick={() => setNewIcon(i)}
                              aria-label={`Choose habit icon ${i + 1}`}
                              className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                                i === newIcon ? "bg-ink text-on-ink" : "liquid-input text-ink"
                              }`}
                            >
                              <I className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </div>
                </CollapseMotion>

                <button
                  onClick={createHabit}
                  disabled={!newName.trim() || isCreatingHabit}
                  className="btn-glass mt-2 flex w-full items-center justify-center py-3 text-[14px] font-bold"
                >
                  {isCreatingHabit ? "Saving…" : "Create habit"}
                </button>
              </div>
            </SheetShell>
          )}

          {/* Habit detail modal */}
          {detail &&
            (() => {
              const h = habits[detail.q][detail.i];
              if (!h) return null;
              // Build real 30-day completion history from Firestore completions
              const todayDate = new Date();
              return (
                <SheetShell
                  onClose={closeHabitDetail}
                  title={h.name}
                  subtitle={QUADRANTS[detail.q].title}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catClass(h.category)}`}
                      >
                        {h.category}
                      </span>
                      {h.time && (
                        <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-[10px] font-medium text-body capitalize">
                          {h.time}
                        </span>
                      )}
                      {h.target !== null && h.target !== undefined && (
                        <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-[10px] font-medium text-body">
                          {completions[h.id]?.value ?? 0}/{h.target} {h.unit ?? ""}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {h.type === "numeric" && h.target != null ? (
                        <>
                          <button type="button" className="btn-subtle-uber px-4 py-3" aria-label={`Decrease ${h.name}`} onClick={() => void adjustValue(detail.q, detail.i, -1)}><Minus className="h-4 w-4" /></button>
                          <span className="flex-1 text-center text-sm font-semibold text-ink">{completions[h.id]?.value ?? 0} / {h.target} {h.unit}</span>
                          <button type="button" className="btn-subtle-uber px-4 py-3" aria-label={`Increase ${h.name}`} onClick={() => void adjustValue(detail.q, detail.i, 1)}><Plus className="h-4 w-4" /></button>
                        </>
                      ) : (
                        <button type="button" className="btn-primary-uber w-full py-3 text-xs" onClick={() => void completeHabit(h)}>{h.done ? "Undo completion" : "Complete habit"}</button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" className="btn-subtle-uber py-2.5 text-xs" onClick={() => requestOverlayClose(closeHabitDetail, () => setEditHabitTarget(detail))}>Edit habit</button>
                      <button type="button" className="btn-subtle-uber py-2.5 text-xs" onClick={() => void togglePin(detail.q, detail.i)}>{h.pinned ? "Unpin" : "Pin"}</button>
                      <button type="button" className="btn-subtle-uber py-2.5 text-xs" onClick={() => requestOverlayClose(closeHabitDetail, () => void moveHabit(detail.q, detail.i))}>Move</button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-canvas-soft px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wider text-body">
                          Current
                        </div>
                        <div className="font-display text-xl font-bold text-ink">{h.streak}d</div>
                      </div>
                      <div className="rounded-2xl bg-canvas-soft px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wider text-body">Best</div>
                        <div className="font-display text-xl font-bold text-ink">
                          {h.best ?? h.streak}d
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-body">
                        <CalendarDays className="h-3.5 w-3.5" /> Last 30 days
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {Array.from({ length: 30 }).map((_, i) => {
                          const dayOffset = 29 - i;
                          const d = new Date(todayDate);
                          d.setDate(d.getDate() - dayOffset);
                          const isFuture = d > todayDate;
                          const dk = formatDateKey(d);
                          const entry = completionsMap[dk]?.[h.id];
                          const done = Boolean(
                            entry && (entry.done || entry.restDay || entry.frozenStreak),
                          );
                          const restDay = Boolean(entry?.restDay);
                          const frozen = Boolean(entry?.frozenStreak);
                          return (
                            <div
                              key={i}
                              title={`${dk}: ${done ? (restDay ? "Rest day" : frozen ? "Streak frozen" : "Completed") : "Missed"}`}
                              className={`aspect-square rounded-md text-[9px] font-semibold grid place-items-center ${
                                isFuture
                                  ? "bg-canvas-soft/50 text-mute"
                                  : done
                                    ? restDay
                                      ? "bg-sky-500/25 text-sky-200 border border-sky-400/30"
                                      : frozen
                                        ? "bg-amber-500/25 text-amber-200 border border-amber-400/30"
                                        : "bg-emerald-500/25 text-emerald-200 border border-emerald-400/30"
                                    : "bg-rose-500/15 text-rose-300/80 border border-rose-400/20"
                              }`}
                            >
                              {d.getDate()}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[10px] text-mute">
                        Today shown in real-time · historical data via heatmap
                      </p>
                    </div>

                    <Field label="Daily note">
                      <input
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="How did it go today?"
                        className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => freezeStreak(detail.q, detail.i)}
                        className="flex items-center justify-center gap-1.5 rounded-2xl bg-canvas-soft px-4 py-3 text-xs font-semibold text-ink hover:bg-[color:var(--surface-pressed)]"
                      >
                        <Snowflake className="h-3.5 w-3.5" /> Freeze today
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await saveHabitNote(h.id, noteDraft.trim());
                            showToast("Note saved");
                            requestOverlayClose(closeHabitDetail);
                          } catch (error) {
                            toastError(error instanceof Error ? error.message : "Note could not be saved");
                          }
                        }}
                        className="btn-primary-uber py-3 text-xs"
                      >
                        Save note
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        requestOverlayClose(closeHabitDetail, () => deleteHabit(detail.q, detail.i));
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20 active:scale-98 mt-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete habit
                    </button>
                  </div>
                </SheetShell>
              );
            })()}

          {/* Podium Feature Modals */}
          <Suspense fallback={null}>
            {aiCoachOpen && (
              <InsightsCoachModal
                onClose={() => setAiCoachOpen(false)}
                insights={weeklyInsights}
                currentStreak={totalStreak}
                doneCount={doneCount}
                totalCount={totalCount}
              />
            )}

            {badgesOpen && (
              <BadgesModal
                onClose={() => setBadgesOpen(false)}
                currentStreak={totalStreak}
                bestStreak={bestStreak}
              />
            )}

            {shareStreakOpen && (
              <ShareStreakModal
                onClose={() => setShareStreakOpen(false)}
                userName={profile.name}
                currentStreak={totalStreak}
                bestStreak={bestStreak}
                totalCompletions={heatmapStats.totalCompletions}
                rate={rate}
                onShowToast={showToast}
              />
            )}

            {weeklyReviewOpen && (
              <WeeklyReviewModal
                onClose={() => setWeeklyReviewOpen(false)}
                habits={flatHabits}
                completionsMap={completionsMap}
                habitStreaks={habitStreaks}
                onShowToast={showToast}
              />
            )}

            {onboardingOpen && (
              <OnboardingModal
                onClose={() => setOnboardingOpen(false)}
                storageKey={onboardingStorageKey}
                onAddHabits={async (newHabits) => {
                  if (!userId) throw new Error("Sign in to add your starter habits.");
                  completeLocalOnboarding(userId, newHabits);
                  showToast(
                    `${newHabits.length === 1 ? "Your first habit is" : "Your starter habits are"} ready · complete one to unlock more tools`,
                    { label: "Got it", onClick: () => undefined },
                    6000,
                  );
                }}
              />
            )}
          </Suspense>
        </div>
      </div>

      {showStaticTargetSelector && (
        <SheetShell
          onClose={closeWallpaperTarget}
          title="Set Static Wallpaper"
          subtitle="Choose where to apply the wallpaper."
          priority={9999}
        >
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <button
              onClick={() => {
                requestOverlayClose(closeWallpaperTarget, () => void applyWallpaper(true, "home"));
              }}
              className="btn-glass w-full h-14 flex items-center justify-center font-bold"
            >
              Home Screen
            </button>
            <button
              onClick={() => {
                requestOverlayClose(closeWallpaperTarget, () => void applyWallpaper(true, "lock"));
              }}
              className="btn-glass w-full h-14 flex items-center justify-center font-bold"
            >
              Lock Screen
            </button>
            <button
              onClick={() => {
                requestOverlayClose(closeWallpaperTarget, () => void applyWallpaper(true, "both"));
              }}
              className="btn-glass w-full h-14 flex items-center justify-center font-bold"
            >
              Both Screens
            </button>

            <button
              onClick={() => requestOverlayClose(closeWallpaperTarget)}
              className="w-full mt-2 h-12 font-semibold text-[color:var(--mute)] active:text-[color:var(--ink)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </SheetShell>
      )}
    </main>
  );
}

function Row({ label, action }: { label: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 group transition">
      <div className="text-sm font-medium text-ink">{label}</div>
      {action}
    </div>
  );
}

function ConfirmDialog({
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  icon,
}: {
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: React.ReactNode;
}) {
  useEffect(() => {
    return registerOverlayDismissal({
      close: (afterClose) => {
        onClose();
        afterClose?.();
      },
      owner: () => onClose,
      priority: 80,
    });
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass sheet-glass specular relative w-full max-w-[320px] overflow-hidden rounded-3xl p-6 text-center animate-modal-scale-enter"
      >
        {icon && (
          <div
            className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl ${
              destructive
                ? "bg-red-500/10 text-red-500 border border-red-500/25"
                : "bg-canvas-soft text-ink border border-[color:var(--hairline)]"
            }`}
          >
            {icon}
          </div>
        )}
        <h4 id="confirm-title" className="font-display text-lg font-bold text-ink">
          {title}
        </h4>
        {description && <p className="mt-2 text-[13px] leading-relaxed text-body">{description}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            data-lg-press
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`pill w-full py-3 text-[14px] font-semibold transition ${
              destructive ? "bg-red-500 text-white hover:bg-red-500/90" : "btn-primary-uber"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            data-lg-press
            onClick={onClose}
            className="btn-subtle-uber w-full py-3 text-[14px] font-semibold"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-body">{label}</label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  pulseKey,
}: {
  label: string;
  value: string;
  pulseKey?: number | string;
}) {
  return (
    <div className="text-center">
      <div
        key={pulseKey ?? label}
        className="font-display text-lg font-bold tabular-nums text-ink animate-pop-badge"
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-body">{label}</div>
    </div>
  );
}

function QuadrantCard({
  q,
  habits,
  timeFilter,
  onToggle,
  onRest,
  onPin,
  onDelete,
  onMove,
  onEdit,
  onAdjust,
  onOpenDetail,
}: {
  q: Quadrant;
  habits: Habit[];
  timeFilter: "all" | "morning" | "afternoon" | "evening";
  onToggle: (i: number) => void;
  onRest: (i: number) => void;
  onPin: (i: number) => void;
  onDelete: (i: number) => void;
  onMove: (i: number) => void;
  onEdit: (i: number) => void;
  onAdjust: (i: number, dir: 1 | -1) => void;
  onOpenDetail: (i: number) => void;
}) {
  const meta = QUADRANTS[q];
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [justDone, setJustDone] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleToggle = (i: number) => {
    const wasDone = habits[i].done;
    onToggle(i);
    if (!wasDone) {
      setJustDone(i);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setJustDone(null), 500);
    }
  };

  const visible = habits
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => timeFilter === "all" || h.time === timeFilter);

  const doneCount = visible.filter(({ h }) => h.done).length;

  return (
    <div className="card-soft relative flex w-full flex-col overflow-hidden border border-[color:var(--hairline)] transition-all">
      {/* Header bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-3 text-left transition hover:bg-[color:var(--canvas-softer)] active:scale-[0.995]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <h3 className="font-display text-sm font-bold text-ink">{meta.title}</h3>
          <span className="text-[10px] font-medium tracking-wider text-mute">· {meta.sub}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium tabular-nums text-mute">
            {doneCount}/{visible.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-mute transition-transform duration-200 ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
        </div>
      </button>

      {/* Content Area */}
      <CollapseMotion open={!collapsed}>
        <div className="px-3 pb-3 pt-0 space-y-1.5">
          {visible.map(({ h, i }) => (
            <HabitRow
              key={`${h.name}-${i}`}
              habit={h}
              justDone={justDone === i}
              menuOpen={openMenu === i}
              onMenuToggle={() => setOpenMenu(openMenu === i ? null : i)}
              onMenuClose={() => setOpenMenu(null)}
              onToggle={() => handleToggle(i)}
              onRest={() => onRest(i)}
              onPin={() => onPin(i)}
              onDelete={() => onDelete(i)}
              onMove={() => onMove(i)}
              onEdit={() => onEdit(i)}
              onAdjust={(dir) => onAdjust(i, dir)}
              onOpenDetail={() => onOpenDetail(i)}
            />
          ))}
          {visible.length === 0 && (
            <div className="py-2.5 text-center text-[11px] font-medium text-mute">
              No habits scheduled
            </div>
          )}
        </div>
      </CollapseMotion>
    </div>
  );
}

// ---------------- Habit Row (swipe-to-complete / rest) ----------------
export const HabitRow = memo(
  function HabitRow({
    habit: h,
    justDone,
    menuOpen,
    onMenuToggle,
    onMenuClose,
    onToggle,
    onRest,
    onPin,
    onDelete,
    onMove,
    onEdit,
    onAdjust,
    onSetValue,
    onOpenDetail,
  }: {
    habit: Habit;
    justDone: boolean;
    menuOpen: boolean;
    onMenuToggle: () => void;
    onMenuClose: () => void;
    onToggle: () => void;
    onRest: () => void;
    onPin: () => void;
    onDelete: () => void;
    onMove: () => void;
    onEdit: () => void;
    onAdjust: (dir: 1 | -1) => void;
    onSetValue?: (val: number) => void;
    onOpenDetail: () => void;
  }) {
    const isNumeric = h.type === "numeric";

    const rawVal = h.value ?? 0;
    const targetVal = h.target || 1;
    const pct = isNumeric
      ? Math.min(100, Math.round((rawVal / targetVal) * 100))
      : h.done
        ? 100
        : 0;
    const isDone = isNumeric ? rawVal >= targetVal || h.done : h.done;
    const stepVal =
      h.step ?? (targetVal >= 500 ? 250 : targetVal >= 60 ? 30 : targetVal >= 10 ? 5 : 1);
    const unitLabel = h.unit ? ` ${h.unit}` : "";

    const [isExpanded, setIsExpanded] = useState(false);

    const handleRowClick = (e: React.MouseEvent) => {
      // If it's boolean, tapping row checks it off. If numeric, expands it.
      if (!isNumeric) {
        onToggle();
      } else {
        setIsExpanded(!isExpanded);
      }
    };

    return (
      <div
        className={`virtualized-row group relative rounded-2xl transition-all duration-300 ${
          isExpanded
            ? "bg-white/5 shadow-md border-[color:var(--hairline-strong)] pb-2"
            : "bg-transparent hover:bg-[color:var(--canvas-softer)]"
        } ${isDone && !isExpanded ? "opacity-70" : ""} ${justDone ? "animate-sync-pulse" : ""}`}
      >
        {/* Top Row (Compact View) */}
        <div
          onClick={handleRowClick}
          className="relative flex cursor-pointer items-center gap-3 liquid-glass p-3 rounded-2xl"
        >
          {isNumeric ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // For numeric, tapping the left icon still just expands it (or maybe increments?)
                // Let's have it expand for consistency, or increment if we want fast logging.
                // Fast logging is better:
                if (isDone) {
                  onSetValue?.(0);
                } else {
                  onSetValue?.(Math.min(targetVal, rawVal + stepVal));
                }
              }}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                isDone
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                  : "border-[color:var(--hairline-strong)] text-ink hover:border-ink hover:bg-ink/5"
              }`}
            >
              {isDone ? (
                <Check className="h-3.5 w-3.5 animate-scale-in" strokeWidth={3} />
              ) : (
                <Droplets className="h-3 w-3" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                h.done
                  ? "border-ink bg-ink text-on-ink"
                  : "border-[color:var(--hairline-strong)] hover:border-ink hover:bg-ink/5"
              }`}
              aria-label={h.done ? `Undo ${h.name}` : `Mark ${h.name} done`}
            >
              {h.done && <Check className="h-3.5 w-3.5 animate-scale-in" strokeWidth={3} />}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-[13px] font-semibold leading-tight ${isDone && !isNumeric ? "line-through text-mute" : "text-ink"}`}
            >
              {h.name}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`rounded-full px-1.5 py-px text-[9px] font-bold ${catClass(h.category)}`}
              >
                {h.category}
              </span>
              {h.streak > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[8px] font-bold text-amber-400">
                  <Flame className="h-2 w-2 fill-amber-400" />
                  {h.streak}d
                </span>
              )}
              {isNumeric && (
                <span className="text-[9px] font-medium text-mute tabular-nums ml-1">
                  {rawVal}/{targetVal}
                  {unitLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                h.pinned
                  ? "text-ink bg-ink/10"
                  : "text-mute hover:text-ink hover:bg-[color:var(--canvas-soft)]"
              }`}
              aria-label="Pin to wallpaper"
            >
              <Pin className="h-3.5 w-3.5" fill={h.pinned ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle();
              }}
              className="grid h-7 w-7 place-items-center rounded-lg text-mute hover:text-ink hover:bg-[color:var(--canvas-soft)]"
              aria-label="More"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expanded Area (For Numeric) */}
        {isNumeric && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-out px-3 ${isExpanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}`}
          >
            {/* Progress Bar */}
            <div className="relative w-full h-1.5 rounded-full bg-[color:var(--hairline-strong)] overflow-hidden my-2.5">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                  isDone
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-ink shadow-[0_0_6px_color-mix(in_srgb,var(--ink)_30%,transparent)]"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center justify-between gap-1.5 pt-1 pb-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={rawVal <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      navigator.vibrate?.(10);
                    } catch {}
                    onSetValue?.(Math.max(0, rawVal - stepVal));
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-sm bg-[color:var(--canvas-soft)] border-[color:var(--hairline)] hover:bg-[color:var(--canvas-softer)] text-mute hover:text-ink"
                >
                  <Minus className="h-3 w-3" />
                  <span>{stepVal}</span>
                </button>

                <button
                  type="button"
                  disabled={isDone}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      navigator.vibrate?.(15);
                    } catch {}
                    onSetValue?.(Math.min(targetVal, rawVal + stepVal));
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all active:scale-95 disabled:opacity-40 shadow-sm border-transparent"
                  style={{
                    background: "color-mix(in srgb, var(--ink) 12%, transparent)",
                    color: "var(--ink)",
                  }}
                >
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                  <span>{stepVal}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    navigator.vibrate?.(20);
                  } catch {}
                  if (isDone) {
                    onSetValue?.(0);
                  } else {
                    onSetValue?.(targetVal);
                    setIsExpanded(false); // auto-collapse when filled
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 shadow-sm border ${
                  isDone
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-ink text-on-ink border-transparent"
                }`}
              >
                {isDone ? (
                  <>
                    <Check className="h-3 w-3 stroke-[2.5]" />
                    <span>Done</span>
                  </>
                ) : (
                  <span>Fill Max</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Options Menu */}
        <DropdownMotion open={menuOpen} className="absolute right-1 top-10 z-20 w-32 overflow-hidden rounded-xl p-1 shadow-xl liquid-glass sheet-glass specular">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-lg"
            >
              <Settings className="h-3.5 w-3.5" /> Edit
            </button>
            {h.pinned ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin();
                  onMenuClose();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-lg"
              >
                <Pin className="h-3.5 w-3.5" /> Unpin
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin();
                  onMenuClose();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-lg"
              >
                <Pin className="h-3.5 w-3.5" fill="currentColor" /> Pin
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRest();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-lg"
            >
              <Shield className="h-3.5 w-3.5" /> Rest Day
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft rounded-lg"
            >
              <Sparkles className="h-3.5 w-3.5" /> Move
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-canvas-soft rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
        </DropdownMotion>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.habit === next.habit &&
      prev.justDone === next.justDone &&
      prev.menuOpen === next.menuOpen &&
      prev.onSetValue === next.onSetValue
    );
  },
);

// ---------------- Profile Edit Sheet ----------------
function ProfileEditSheet({
  profile,
  onClose,
  onSave,
}: {
  profile: { name: string; tagline: string; initials: string };
  onClose: () => void;
  onSave: (next: { name: string; tagline: string; initials: string }) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline);
  const [initials, setInitials] = useState(profile.initials);
  const [initialsTouched, setInitialsTouched] = useState(false);
  const dismiss = useSheetDismiss(onClose);

  const derivedInitials =
    (name || "U")
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const effectiveInitials =
    (initialsTouched ? initials : derivedInitials).slice(0, 2).toUpperCase() || "U";

  return (
    <SheetShell onClose={onClose} title="Edit profile" subtitle="Update how you show up in the app">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-canvas-soft p-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-on-ink font-display text-lg font-bold">
            {effectiveInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">
              {name || "Your name"}
            </p>
            <p className="truncate text-[11px] text-body">{tagline || "Your tagline"}</p>
          </div>
        </div>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <Field label="Tagline">
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short line about you"
            maxLength={80}
            className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <Field label="Avatar initials (1–2 letters)">
          <input
            value={initialsTouched ? initials : derivedInitials}
            onChange={(e) => {
              setInitialsTouched(true);
              setInitials(e.target.value.slice(0, 2));
            }}
            placeholder="e.g. JD"
            maxLength={2}
            className="w-32 rounded-2xl bg-canvas-soft px-4 py-3 text-sm uppercase tracking-wider text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={dismiss}
            className="btn-subtle-uber w-full py-3 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                name: name.trim() || "You",
                tagline: tagline.trim() || profile.tagline,
                initials: effectiveInitials,
              })
            }
            className="btn-primary-uber w-full py-3 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </SheetShell>
  );
}

// ---------------- Edit Habit Sheet ----------------
function EditHabitSheet({
  habit,
  quadrant,
  onClose,
  onSave,
  onDelete,
}: {
  habit: Habit;
  quadrant: Quadrant;
  onClose: () => void;
  onSave: (patch: Partial<Habit>, newQ?: Quadrant) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(habit.name);
  const [category, setCategory] = useState(habit.category);
  const [q, setQ] = useState<Quadrant>(quadrant);
  const [time, setTime] = useState<Habit["time"] | undefined>(habit.time);
  const [isNumeric, setIsNumeric] = useState(habit.type === "numeric");
  const [target, setTarget] = useState<number>(habit.target ?? 1);
  const [unit, setUnit] = useState<string>(habit.unit ?? "");
  const [frequency, setFrequency] = useState<Habit["frequency"]>(habit.frequency);
  const [customDays, setCustomDays] = useState<number[]>(habit.customDays ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const TIMES: Array<{ key: NonNullable<Habit["time"]> | "any"; label: string }> = [
    { key: "any", label: "Anytime" },
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening", label: "Evening" },
  ];

  return (
    <>
      <SheetShell onClose={onClose} title="Edit habit" subtitle={habit.name}>
        <div className="space-y-4">
          <Field label="Habit name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
            />
          </Field>

          <Field label="Category">
            <HabitCategoryPicker value={category} onChange={setCategory} />
          </Field>

          <Field label="Priority quadrant">
            <div className="grid grid-cols-2 gap-2">
              {QUADRANT_ORDER.map((qq) => {
                const active = q === qq;
                return (
                  <button
                    key={qq}
                    onClick={() => setQ(qq)}
                    className={`pill px-3 py-2.5 text-left text-xs font-medium transition ${
                      active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                    }`}
                  >
                    {QUADRANTS[qq].title}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Time of day">
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => {
                const active = (time ?? "any") === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTime(t.key === "any" ? undefined : (t.key as Habit["time"]))}
                    className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                      active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Frequency">
            <div className="grid grid-cols-3 gap-2">
              {(["daily", "weekdays", "custom"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFrequency(option)}
                  className={`pill px-3 py-2 text-xs font-medium capitalize ${frequency === option ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"}`}
                >
                  {option === "daily" ? "Daily" : option === "weekdays" ? "Weekdays" : "Custom"}
                </button>
              ))}
            </div>
            {frequency === "custom" && (
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
                  const active = customDays.includes(index);
                  return (
                    <button
                      key={`${day}-${index}`}
                      type="button"
                      aria-label={`Repeat on ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]}`}
                      onClick={() =>
                        setCustomDays((days) =>
                          active ? days.filter((value) => value !== index) : [...days, index],
                        )
                      }
                      className={`h-8 rounded-full text-[11px] font-bold ${active ? "bg-ink text-on-ink" : "bg-canvas-soft text-mute"}`}
                      aria-pressed={active}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsNumeric(false)}
                className={`pill px-3 py-2.5 text-xs font-medium transition ${!isNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"}`}
              >
                Binary
              </button>
              <button
                onClick={() => setIsNumeric(true)}
                className={`pill px-3 py-2.5 text-xs font-medium transition ${isNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"}`}
              >
                Numeric
              </button>
            </div>
          </Field>

          {isNumeric && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Target">
                <input
                  type="number"
                  value={target}
                  min={0}
                  step="0.25"
                  onChange={(e) => setTarget(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none focus:bg-[color:var(--canvas-softer)]"
                />
              </Field>
              <Field label="Unit">
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="glasses, km…"
                  className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              data-lg-press
              onClick={() => setConfirmDelete(true)}
              className="pill w-full border border-red-500/30 bg-red-500/5 py-3 text-sm font-semibold text-red-500"
            >
              <Trash2 className="mr-1.5 inline h-3.5 w-3.5" /> Delete
            </button>
            <button
              data-lg-press
              disabled={(isNumeric && (!Number.isFinite(target) || target <= 0)) || (frequency === "custom" && customDays.length === 0)}
              onClick={() => {
                const patch: Partial<Habit> = {
                  name: name.trim() || habit.name,
                  category,
                  time,
                  type: isNumeric ? "numeric" : "binary",
                  frequency,
                  customDays: frequency === "custom" ? customDays : [],
                };
                if (isNumeric) {
                  patch.target = target;
                  patch.unit = unit;
                  patch.step = habit.step ?? 0.25;
                  patch.value = habit.value ?? 0;
                } else {
                  patch.target = undefined;
                  patch.unit = undefined;
                  patch.value = undefined;
                }
                onSave(patch, q);
              }}
              className="btn-primary-uber w-full py-3 text-sm"
            >
              Save changes
            </button>
          </div>
        </div>
      </SheetShell>
      {confirmDelete && (
        <ConfirmDialog
          onClose={() => setConfirmDelete(false)}
          onConfirm={onDelete}
          title="Delete habit?"
          description={`"${habit.name}" will be removed. You can undo from the snackbar.`}
          confirmLabel="Delete"
          destructive
          icon={<Trash2 className="h-5 w-5" />}
        />
      )}
    </>
  );
}
