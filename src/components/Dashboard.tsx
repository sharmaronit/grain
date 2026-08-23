import { ConsistencyTab } from "../components/tabs/ConsistencyTab";
import { SwipeModeView } from "./SwipeModeView";
import { HabitCard } from "./HabitCard";
import { OnboardingModal } from "./OnboardingModal";
import { WeeklyReviewModal } from "./WeeklyReviewModal";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, startTransition, memo } from "react";
import { toPng } from "html-to-image";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layers,
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
  Wallpaper,
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
  User, GripVertical,
  MessageSquare,
  Hexagon,
  ArrowUpRight,
  Eye,
  ImagePlus,
  Infinity
} from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
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
import { getFirestore, updateDoc, doc } from "firebase/firestore";
import { scheduleDailyReminder } from "../lib/reminders";
import { useHabits } from "../hooks/useHabits";
import { useCompletions } from "../hooks/useCompletions";
import { useHeatmap } from "../hooks/useHeatmap";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
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
} from "../lib/dates";
import {
  calculateStreak,
  calculateBestStreak,
  type CompletionsMap,
} from "../lib/streaks";

// ── Podium Features Modules ─────────────────────────────
import { HABIT_PACKS, type HabitPack } from "../lib/templates";
import { computeWeeklyInsights } from "../lib/insights";
import { computeMilestones } from "../lib/badges";
import { InsightsCard } from "../components/InsightsCard";
import { BadgesModal } from "../components/BadgesModal";
import { InsightsCoachModal } from "../components/InsightsCoachModal";
import { ShareStreakModal } from "../components/ShareStreakModal";
import { TodayHero } from "../components/TodayHero";
import { WallpaperNative } from "../lib/wallpaper-bridge";
import { useWallpaperSync } from "../hooks/useWallpaperSync";
import { GoalTab } from "../components/tabs/GoalTab";
import { useGoals } from "../hooks/useGoals";
import { deleteGoal } from "../lib/firestore";
import { Target } from "lucide-react";
import { useStore } from "../store/useStore";
import { TIME_TABS, HABIT_SETS, GRID_SIZES } from "../lib/constants";
import {
  WALLPAPER_THEMES,
  GRID_COLORS,
  resolveThemeKey,
  wallpaperThemeOf,
  gridColorOf,
  wallpaperTokens,
  type WpTokens
} from "../lib/theme";

import type { AppTab, Theme, WallpaperState, Habit } from "../components/types";
import { WheelPicker } from "./ui/WheelPicker";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "./ui/drawer";

const catClass = (_c: string) => "bg-canvas-soft text-body border border-[color:var(--hairline)]";

const QUADRANTS: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do first", sub: "Urgent · Important" },
  q2: { title: "Schedule", sub: "Important · Not urgent" },
  q3: { title: "Delegate", sub: "Urgent · Low impact" },
  q4: { title: "Don't do", sub: "Low · Not urgent" },
};

const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];
const TIME_ORDER = ["morning", "afternoon", "evening", "any"] as const;

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

const TODAY_COL = 51;
const TODAY_ROW = isoDow(new Date());

export function Dashboard({ user }: { user?: any }) {
  const [showStaticTargetSelector, setShowStaticTargetSelector] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeDragHabit, setActiveDragHabit] = useState<any>(null);

  const handleDragStart = (event: any) => {
    const { active } = event;
    const habit = flatHabits.find((h: any) => h.id === active.id);
    if (habit) setActiveDragHabit(habit);
  };

  const handleDragEnd = async (event: any) => {
    setActiveDragHabit(null);
    const { active, over } = event;
    if (!over) return;

    const activeHabit = flatHabits.find((h: any) => h.id === active.id);
    if (!activeHabit) return;

    let targetQuadrant = activeHabit.quadrant;
    let targetOrder = activeHabit.order;

    if (["q1", "q2", "q3", "q4"].includes(over.id)) {
      targetQuadrant = over.id;
      const quadrantHabits = habits[targetQuadrant as keyof typeof habits] || [];
      targetOrder = quadrantHabits.length > 0 ? (quadrantHabits[quadrantHabits.length - 1] as any).order + 1 : 0;
    } else {
      const overHabit = flatHabits.find((h: any) => h.id === over.id);
      if (overHabit) {
        targetQuadrant = overHabit.quadrant;
        targetOrder = overHabit.order;
      }
    }

    if (activeHabit.quadrant !== targetQuadrant || activeHabit.order !== targetOrder) {
      await updateHabitDoc(active.id, { quadrant: targetQuadrant, order: targetOrder + 0.1 } as any);
    }
  };

  const userId = user?.email ?? user?.uid ?? null;
  const online = useOnlineStatus();

  const [dateStyle, setDateStyle] = useState<"underline" | "block" | "mono">("underline");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  const TAB_ORDER: AppTab[] = ["today", "consistency", "myday", "goal", "wallpaper"];
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [tabDirection, setTabDirection] = useState<"left" | "right">("left");
  const [swipeMode, setSwipeMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const swipeContainerRef = useRef<HTMLDivElement | null>(null);
  const isNavigatingRef = useRef(false);

  const switchTab = (tab: AppTab) => {
    if (activeTab === tab) return;
    const currentIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx = TAB_ORDER.indexOf(tab);
    setTabDirection(nextIdx >= currentIdx ? "left" : "right");
    startTransition(() => {
      setActiveTab(tab);
    });

    if (swipeContainerRef.current) {
      const targetElement = swipeContainerRef.current.querySelector(`[data-tab-id="${tab}"]`);
      if (targetElement) {
        isNavigatingRef.current = true;
        targetElement.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 600);
      }
    }
  };

  useEffect(() => {
    const container = swipeContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isNavigatingRef.current) return;
        
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const tabId = entry.target.getAttribute("data-tab-id") as AppTab;
            if (tabId && tabId !== activeTab) {
              startTransition(() => setActiveTab(tabId));
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    const tabs = container.querySelectorAll("[data-tab-id]");
    tabs.forEach(tab => observer.observe(tab));

    return () => observer.disconnect();
  }, [activeTab]);

  const { goals } = useGoals(userId);
  const activeGoalId = useStore((s) => s.activeGoalId);
  const setActiveGoalId = useStore((s) => s.setActiveGoalId);

  const [selectedHabit, setSelectedHabit] = useState("All habits");
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    return typeof window !== "undefined" && !localStorage.getItem("grain_onboarded");
  });
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const [activeSettingTab, setActiveSettingTab] = useState<"theme" | "style" | "color" | "habits" | "stats" | "size">("theme");
  const [applyMenuOpen, setApplyMenuOpen] = useState(false);
  const toolbarDragStartY = useRef<number | null>(null);
  const [wallpaperSync, setWallpaperSync] = useState(true);
  const [wallpaperState, setWallpaperState] = useState<WallpaperState>("idle");
  const [wallpaperSnapshot, setWallpaperSnapshot] = useState<number[][] | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>("q2");
  const [theme, setTheme] = useState<Theme>("dark");
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; onClick: () => void } } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // ── Real Firebase Hooks ─────────────────────────────────
  const {
    habits: rawHabits,
    byQuadrant: habitsByQ,
    loading: habitsLoading,
    add: addHabit,
    update: updateHabitDoc,
    remove: removeHabitDoc,
    restore: restoreHabitDoc,
  } = useHabits(userId);

  const {
    entries: completions,
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
  } = useHeatmap(userId, rawHabits, selectedHabit);

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
  const [wallpaperGridStyle, setWallpaperGridStyle] = useState<"weeks" | "year" | "month" | "goals">("weeks");
  const [wallpaperCustomPhoto, setWallpaperCustomPhoto] = useState<string | null>(null);
  const [wallpaperPhotoOverlay, setWallpaperPhotoOverlay] = useState<number>(0.4);
  const [wallpaperStatsAlign, setWallpaperStatsAlign] = useState<"left" | "center" | "right">("center");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const wallpaperGridRef = useRef<HTMLDivElement>(null);
  const wallpaperPhotoRef = useRef<HTMLImageElement>(null);
  const [wallpaperOffset, setWallpaperOffset] = useState({ x: 0, y: 0 });
  const [wallpaperPhotoOffset, setWallpaperPhotoOffset] = useState({ x: 0, y: 0 });
  const [wallpaperPhotoScale, setWallpaperPhotoScale] = useState(1);
  const [isMovingPhoto, setIsMovingPhoto] = useState(false);
  const [isDraggingWallpaper, setIsDraggingWallpaper] = useState(false);
  const [wallpaperScale, setWallpaperScale] = useState(1);
  const [remindersOn, setRemindersOn] = useState(true);
  const [detail, setDetail] = useState<{ q: Quadrant; i: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (detail) {
      const h = habits[detail.q]?.[detail.i];
      if (h) setNoteDraft((h as any).note || "");
    }
  }, [detail?.q, detail?.i]);

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

  // Compute 28-day weekly insights
  const weeklyInsights = useMemo(
    () => computeWeeklyInsights(rawHabits, completionsMap, habitStreaks),
    [rawHabits, completionsMap, habitStreaks]
  );

  // Floating page title pill state & 2-second auto-fade timer
  const [showTitlePill, setShowTitlePill] = useState(true);
  const titlePillTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setShowTitlePill(true);
    if (titlePillTimerRef.current) window.clearTimeout(titlePillTimerRef.current);
    titlePillTimerRef.current = window.setTimeout(() => {
      setShowTitlePill(false);
      titlePillTimerRef.current = null;
    }, 2000);

    return () => {
      if (titlePillTimerRef.current) window.clearTimeout(titlePillTimerRef.current);
    };
  }, [activeTab]);

  useEffect(() => {
    const handleBackButton = () => {
      // 1. Check Modals in order of precedence
      if (signOutOpen) { setSignOutOpen(false); return; }
      if (resetConfirmOpen) { setResetConfirmOpen(false); return; }
      if (profileEditOpen) { setProfileEditOpen(false); return; }
      if (editHabitTarget) { setEditHabitTarget(null); return; }
      if (detail) { setDetail(null); return; }
      if (aiCoachOpen) { setAiCoachOpen(false); return; }
      if (badgesOpen) { setBadgesOpen(false); return; }
      if (shareStreakOpen) { setShareStreakOpen(false); return; }
      if (streakOpen) { setStreakOpen(false); return; }
      if (wallpaperPreview) { setWallpaperPreview(false); return; }
      if (filterOpen) { setFilterOpen(false); return; }
      if (modalOpen) { setModalOpen(false); return; } // Add Habit modal
      if (settingsOpen) { setSettingsOpen(false); return; }

      // 2. Check Tabs
      if (activeTab !== "today") {
        switchTab("today");
        return;
      }

      // 3. Exit App
      CapacitorApp.exitApp();
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);
    return () => {
      listener.then((l: any) => l.remove());
    };
  }, [
    signOutOpen, resetConfirmOpen, profileEditOpen, editHabitTarget, detail,
    aiCoachOpen, badgesOpen, shareStreakOpen, streakOpen, wallpaperPreview,
    filterOpen, modalOpen, settingsOpen, activeTab
  ]);

  const [profile, setProfile] = useState<{ name: string; email: string; tagline: string; initials: string }>(() => {
    const name = user?.displayName || user?.email?.split("@")[0] || "You";
    const initials = name.split(/\s+/).map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
    return { name, email: user?.email || "", tagline: "Building the 1% better version daily.", initials };
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
        const prefs = (docData as any).prefs;
        if (prefs) {
          setWallpaperTheme(prefs.wallpaperTheme ?? "auto");
          setGridColorTheme(prefs.gridColorTheme ?? "emerald");
          setWallpaperHabitSet(prefs.wallpaperHabitSet ?? "none");
          setWallpaperGridStyle(prefs.wallpaperGridStyle as any ?? "weeks");
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
          if (typeof prefs.remindersOn === "boolean") setRemindersOn(prefs.remindersOn);
          if (typeof prefs.previewWeeks === "number") setPreviewWeeks(prefs.previewWeeks);
          if (prefs.timeFilter) setTimeFilter(prefs.timeFilter);
          if (prefs.theme) setTheme(prefs.theme as Theme);
        }
      }
    });
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
  const [newShade, setNewShade] = useState(0);
  const [newIcon, setNewIcon] = useState(0);
  const [newCategory, setNewCategory] = useState<string>("Mind");
  const [newTime, setNewTime] = useState<Habit["time"] | undefined>(undefined);
  const [newIsNumeric, setNewIsNumeric] = useState(false);
  const [newTarget, setNewTarget] = useState<number>(1);
  const [newUnit, setNewUnit] = useState<string>("");

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

  const doneCount = flatHabits.filter((h) => completions[h.id]?.done || completions[h.id]?.restDay).length;
  const totalCount = flatHabits.length;
  const totalStreak = heatmapStats.currentStreak;
  const rate = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  // Liquid-glass ripple + subtle haptic tap on any button/chip.
  useEffect(() => {
    const root = scrollRef.current?.parentElement ?? document.body;
    const onDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        '[class*="btn-"], [class*="chip-"], [data-lg-press]'
      );
      if (!target) return;
      if (target.hasAttribute("disabled")) return;
      try { navigator.vibrate?.(18); } catch { }

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

  const showToast = (msg: string, action?: { label: string; onClick: () => void }, duration = 1600) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ msg, action });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((t) => (t?.msg === msg ? null : t));
      toastTimerRef.current = null;
    }, duration);
  };

  const toggleDone = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    const wasDone = targetHabit.done;
    if (!wasDone) {
      try { navigator.vibrate?.([14, 40, 22]); } catch { }
    }
    await toggleHabitDone(targetHabit.id);
  };

  const restHabit = async (q: Quadrant, i: number) => {
    const target = habits[q][i];
    if (!target || target.done) return;
    try { navigator.vibrate?.(10); } catch { }
    await setHabitRestDay(target.id);
    showToast(`Rest day · "${target.name}" streak preserved`);
  };

  const adjustValue = async (q: Quadrant, i: number, dir: 1 | -1) => {
    const targetHabit = habits[q][i];
    if (!targetHabit || targetHabit.target === null || targetHabit.target === undefined) return;
    const step = targetHabit.step ?? 0.25;
    await adjustHabitValue(targetHabit.id, dir, step, targetHabit.target);
  };

  const freezeStreak = (q: Quadrant, i: number) => {
    try {
      const targetHabit = habits[q][i];
      if (!targetHabit) return;
      freezeHabitStreak(targetHabit.id).catch(err => console.error("Freeze error:", err));
      showToast(`Streak frozen for "${targetHabit.name}"`);
    } finally {
      setDetail(null);
    }
  };

  const togglePin = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    await updateHabitDoc(targetHabit.id, { pinned: !targetHabit.pinned });
    showToast(!targetHabit.pinned ? `Pinned "${targetHabit.name}"` : `Unpinned "${targetHabit.name}"`);
  };

  const deleteHabit = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    try { navigator.vibrate?.([28, 60, 40]); } catch { }
    const removed = await removeHabitDoc(targetHabit.id);
    if (!removed) return;
    showToast(
      `Deleted "${removed.name}"`,
      {
        label: "Undo",
        onClick: () => {
          try { navigator.vibrate?.(10); } catch { }
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

  const createHabit = () => {
    const name = newName.trim();
    if (!name) {
      showToast("Please enter a name for your habit");
      return;
    }
    const freq = newFreq === "Weekdays" ? "weekdays" : newFreq === "Custom" ? "custom" : "daily";

    // Close modal immediately
    setModalOpen(false);

    const habitData = {
      name,
      category: newCategory,
      quadrant: selectedQuadrant,
      time: newTime ?? null,
      type: newIsNumeric ? "numeric" : "binary",
      target: newIsNumeric ? (newTarget || 1) : null,
      unit: newIsNumeric ? (newUnit || null) : null,
      step: newIsNumeric ? 0.25 : null,
      pinned: false,
      frequency: freq,
      customDays: [0, 1, 2, 3, 4],
      icon: newIcon,
      shade: newShade,
      bestStreak: 0,
      order: flatHabits.length > 0 ? Math.min(...flatHabits.map(h => h.order)) - 1 : 0,
    };

    // Reset ALL form fields so next open is a clean slate
    setNewName("");
    setNewCategory("Mind");
    setNewFreq("Daily");
    setNewShade(0);
    setNewIcon(0);
    setNewTime(undefined);
    setNewIsNumeric(false);
    setNewTarget(1);
    setNewUnit("");

    addHabit(habitData as any).then(() => {
      showToast(`Added "${name}"`);
    }).catch(console.error);
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

  const displayedHeatmap = useMemo(() => {
    const baseHeatmap = wallpaperSync ? heatmap : (wallpaperSnapshot ?? heatmap);
    if (activeGoalId && wallpaperHabitSet === "none") {
      const goal = goals.find(g => g.id === activeGoalId);
      if (goal && goal.startDate && goal.targetDate) {
        const start = parseDateKey(goal.startDate);
        const target = parseDateKey(goal.targetDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Heatmap always starts 52 weeks ago
        const heatmapStart = new Date(today);
        heatmapStart.setDate(heatmapStart.getDate() - (52 * 7 - 1));

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
  const activeGoal = useMemo(() => goals.find(g => g.id === activeGoalId), [goals, activeGoalId]);
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
    const active = goals.filter(g => {
      if (!g.startDate || !g.targetDate) return false;
      const target = parseDateKey(g.targetDate);
      return target.getTime() >= new Date().setHours(0, 0, 0, 0);
    });

    return active.map(goal => {
      const start = parseDateKey(goal.startDate!);
      const target = parseDateKey(goal.targetDate!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalDays = Math.max(1, Math.round((target.getTime() - start.getTime()) / 86400000) + 1);
      const elapsedDays = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000) + 1);
      const daysLeft = Math.max(0, totalDays - Math.min(elapsedDays, totalDays));
      const pct = Math.round((Math.min(elapsedDays, totalDays) / totalDays) * 100);

      const heatmap: number[][] = Array.from({ length: 52 }, () => Array(7).fill(0));
      const heatmapStart = new Date(today);
      heatmapStart.setDate(heatmapStart.getDate() - (52 * 7 - 1));

      for (let w = 0; w < 52; w++) {
        for (let d = 0; d < 7; d++) {
          const date = new Date(heatmapStart);
          date.setDate(date.getDate() + w * 7 + d);
          date.setHours(0, 0, 0, 0);

          if (date.getTime() >= start.getTime() && date.getTime() <= target.getTime()) {
            if (date.getTime() <= today.getTime()) {
              heatmap[w][d] = 3; // elapsed
            } else {
              heatmap[w][d] = 1; // future
            }
          }
        }
      }

      return {
        id: goal.id,
        title: goal.name,
        heatmap,
        boxes: heatmap.flatMap(col => col),
        currentStreak: daysLeft,
        completionRate: pct
      };
    });
  }, [wallpaperGridStyle, goals]);

  const habitTextLines = useMemo(() => {
    if (wallpaperHabitSet === "none" || wallpaperGridStyle !== "weeks") return undefined;
    return HABIT_SETS.find(s => s.key === wallpaperHabitSet)?.habits as string[] | undefined;
  }, [wallpaperHabitSet, wallpaperGridStyle]);

  useWallpaperSync({
    heatmap: displayedHeatmap,
    heatmapStartMs: heatmapStartDate().getTime(),
    totalStreak: displayedTotalStreak,
    completionRate: displayedRate,
    wallpaperTheme,
    previewWeeks,
    wallpaperSync,
    isGoalActive: !!(activeGoalId && goals.some(g => g.id === activeGoalId)),
    accentColor: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).accent,
    gridStyle: wallpaperGridStyle,
    customPhotoBase64: wallpaperTheme === "custom" ? wallpaperCustomPhoto : null,
    photoOverlay: wallpaperPhotoOverlay,
    statsAlignment: wallpaperStatsAlign,
    offsetY: typeof window !== "undefined" ? 50 + (wallpaperOffset.y / window.innerHeight) * 100 : 54,
    offsetX: wallpaperOffset.x,
    gridScale: wallpaperScale,
    gridColorTheme: gridColorTheme,
    photoOffsetX: wallpaperPhotoOffset.x,
    photoOffsetY: wallpaperPhotoOffset.y,
    photoScale: wallpaperPhotoScale,
    stackedGoals: stackedGoals,
    habitText: habitTextLines,
  });

  const applyWallpaper = async (forceStatic: boolean = false, screenTarget: string = "both") => {
    if (wallpaperState !== "idle") return;
    setWallpaperState("applying");
    try {
      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
        const { supported } = await WallpaperNative.isLiveWallpaperSupported();
        if (supported && !forceStatic) {
          await WallpaperNative.setWallpaper({
            heatmap: displayedHeatmap,
            heatmapStartMs: heatmapStartDate().getTime(),
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: displayedTotalStreak,
            completionRate: displayedRate,
            isGoalActive: !!(activeGoalId && goals.some(g => g.id === activeGoalId)),
            accentColor: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).accent,
            gridStyle: wallpaperGridStyle,
            customPhotoBase64: wallpaperTheme === "custom" ? wallpaperCustomPhoto : null,
            photoOverlay: wallpaperPhotoOverlay,
            statsAlignment: wallpaperStatsAlign,
            offsetY: typeof window !== "undefined" ? 50 + (wallpaperOffset.y / window.innerHeight) * 100 : 54,
            offsetX: wallpaperOffset.x,
            gridScale: wallpaperScale,
            gridColorTheme: gridColorTheme,
            photoOffsetX: wallpaperPhotoOffset.x,
            photoOffsetY: wallpaperPhotoOffset.y,
            photoScale: wallpaperPhotoScale,
            stackedGoals: stackedGoals,
            habitText: habitTextLines,
          });
          showToast("Wallpaper picker opened \u2014 confirm to apply", undefined, 4000);
        } else {
          await WallpaperNative.setStaticWallpaper({
            screenTarget,
            heatmap: displayedHeatmap,
            heatmapStartMs: heatmapStartDate().getTime(),
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: displayedTotalStreak,
            completionRate: displayedRate,
            isGoalActive: !!(activeGoalId && goals.some(g => g.id === activeGoalId)),
            accentColor: wallpaperTokens(wallpaperTheme, gridColorTheme, theme).accent,
            gridStyle: wallpaperGridStyle,
            customPhotoBase64: wallpaperTheme === "custom" ? wallpaperCustomPhoto : null,
            photoOverlay: wallpaperPhotoOverlay,
            statsAlignment: wallpaperStatsAlign,
            offsetY: typeof window !== "undefined" ? 50 + (wallpaperOffset.y / window.innerHeight) * 100 : 54,
            offsetX: wallpaperOffset.x,
            gridScale: wallpaperScale,
            gridColorTheme: gridColorTheme,
            photoOffsetX: wallpaperPhotoOffset.x,
            photoOffsetY: wallpaperPhotoOffset.y,
            photoScale: wallpaperPhotoScale,
            stackedGoals: stackedGoals,
            habitText: habitTextLines,
          });
          showToast("Static wallpaper applied!", undefined, 4000);
        }
      } else {
        const cap = await capturePreview();
        if (cap) {
          const a = document.createElement("a");
          a.href = cap.dataUrl;
          a.download = `grain-lockscreen-${wallpaperTheme}-${Date.now()}.png`;
          a.click();
          showToast("Wallpaper saved \u2014 select Set as Lock Screen in Gallery", undefined, 4000);
        }
      }
      setWallpaperState("applied");
      setWallpaperSnapshot(heatmap.map((c) => c.slice()));
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("static")) {
        showToast("Static wallpaper failed. Try Live Wallpaper instead.");
      } else {
        showToast("Could not generate wallpaper image");
      }
    } finally {
      window.setTimeout(() => setWallpaperState("idle"), 2500);
    }
  };

  const capturePreview = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    const node = previewRef.current;
    if (!node) return null;
    // Render at 3x for crisp wallpaper-quality output.
    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: wallpaperThemeOf(wallpaperTheme, theme).bg.startsWith("#") ? wallpaperThemeOf(wallpaperTheme, theme).bg : "#000000",
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
      const file = new File([cap.blob], `grain-wallpaper.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
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
          const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
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
      const a = document.createElement("a");
      a.href = cap.dataUrl;
      a.download = `grain-${wallpaperTheme}-${Date.now()}.png`;
      a.click();
      if (!user) return;
      try {
        const db = getFirestore();
        await updateDoc(doc(db, "users", user.uid), {
          prefs: { wallpaperTheme, gridColorTheme, wallpaperHabitSet, wallpaperGridStyle, wallpaperScale, wallpaperPhotoOverlay, wallpaperStatsAlign, wallpaperSync, remindersOn, timeFilter, theme, previewWeeks, activeGoalId, wallpaperOffset, wallpaperPhotoOffset, wallpaperPhotoScale },
        });
      } catch (err) {
        console.error("Failed to save wallpaper prefs", err);
      }
      showToast("Saved to downloads");
      if (navigator.vibrate) navigator.vibrate(18);
    } catch {
      showToast("Could not save wallpaper");
    } finally {
      setCaptureBusy(null);
    }
  };


  const exportBackup = () => {
    try {
      const payload = {
        profile,
        habits,
        heatmap,
        prefs: { wallpaperTheme, gridColorTheme, wallpaperHabitSet, wallpaperGridStyle, wallpaperScale, wallpaperPhotoOverlay, wallpaperStatsAlign, wallpaperSync, remindersOn, timeFilter, theme, previewWeeks, wallpaperOffset, wallpaperPhotoOffset, wallpaperPhotoScale },
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grain-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${flatHabits.length} habits`);
    } catch {
      showToast("Export failed");
    }
  };

  const resetToday = async () => {
    try {
      for (const h of flatHabits) {
        const entry = completions[h.id];
        // Clear done, restDay, and frozenStreak completions for today
        if (entry?.done || entry?.restDay || entry?.frozenStreak) {
          if (entry?.done) await toggleHabitDone(h.id); // toggles back to undone
        }
      }
      try { navigator.vibrate?.([28, 60, 40]); } catch { }
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxW = 1080;
        const maxH = 1920;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.floor(w * ratio);
          h = Math.floor(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setWallpaperCustomPhoto(dataUrl);
        setWallpaperTheme("custom");
        showToast("Photo applied");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
    const state = dragState.current;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.pointers.size === 1) {
      state.isDragging = true;
      setIsDraggingWallpaper(true);
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.initialOffset = { ...wallpaperOffset };
      state.initialPhotoOffset = { ...wallpaperPhotoOffset };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
        const newScale = Math.max(0.1, Math.min(10, state.initialPhotoScale * scaleDiff));
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
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { }

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
        const match = wallpaperPhotoRef.current?.style.transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
        if (match) setWallpaperPhotoOffset({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
      } else {
        const match = wallpaperGridRef.current?.style.transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
        if (match) setWallpaperOffset({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
      }
    } else if (state.pointers.size === 1) {
      const remaining = Array.from(state.pointers.values())[0];
      state.startX = remaining.x;
      state.startY = remaining.y;

      if (isMovingPhoto) {
        const match = wallpaperPhotoRef.current?.style.transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
        if (match) {
          state.initialPhotoOffset = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
          setWallpaperPhotoOffset(state.initialPhotoOffset);
        }
      } else {
        const match = wallpaperGridRef.current?.style.transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
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
      setWallpaperPhotoScale(s => Math.max(0.1, Math.min(10, s - e.deltaY * zoomSensitivity)));
    } else {
      setWallpaperScale(s => Math.max(0.2, Math.min(5, s - e.deltaY * zoomSensitivity)));
    }
  };

  useEffect(() => {
    if (activeSettingTab === "size" && wallpaperGridStyle !== "weeks") {
      setActiveSettingTab("style");
    }
  }, [wallpaperGridStyle, activeSettingTab]);

  const renderSettingsMenu = () => {
    const tabs = ["theme", "style", "color", "habits", "stats", ...(wallpaperGridStyle === "weeks" ? ["size"] : [])] as const;
    return (
      <div className="flex flex-col gap-5 w-full animate-fade-in">
        {/* Category Tabs */}
        <div className="w-full">
          <WheelPicker
            options={tabs.map(tab => ({ key: tab, label: tab === "size" ? "GRID SIZE" : tab.toUpperCase() }))}
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
                options={WALLPAPER_THEMES.filter(t => t.key !== "custom").map(t => ({ key: t.key, label: t.label }))}
                value={wallpaperTheme}
                onChange={(v) => {
                  setWallpaperTheme(v);
                  showToast(`${WALLPAPER_THEMES.find(t => t.key === v)?.label} applied`);
                }}
                itemWidth={110}
                fontSizeClass="text-[14px]"
              />
            </div>
          )}
          {activeSettingTab === "color" && (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory py-3 px-2 w-full animate-fade-in-right">
              {GRID_COLORS.map((t) => {
                const active = gridColorTheme === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setGridColorTheme(t.key);
                      showToast(`${t.label} grid`);
                    }}
                    aria-label={t.label}
                    title={t.label}
                    className={`h-8 w-8 rounded-full border transition-all shrink-0 snap-center ${active
                      ? "border-white ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110 shadow-md"
                      : "border-white/30 hover:scale-105"
                      }`}
                    style={{ background: t.color }}
                  />
                );
              })}
              <label
                className={`relative h-8 w-8 rounded-full border transition-all shrink-0 snap-center flex items-center justify-center bg-[conic-gradient(red,yellow,lime,aqua,blue,fuchsia,red)] ${gridColorTheme.startsWith("#") ? "border-white ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110 shadow-md" : "border-white/30 hover:scale-105"
                  }`}
                title="Custom Color"
              >
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  value={gridColorTheme.startsWith("#") ? gridColorTheme : "#22c55e"}
                  onChange={(e) => {
                    setGridColorTheme(e.target.value);
                  }}
                />
              </label>
            </div>
          )}

          {activeSettingTab === "habits" && (
            <div className="w-full animate-fade-in-right">
              <WheelPicker
                options={[...HABIT_SETS]}
                value={wallpaperHabitSet}
                onChange={(v) => {
                  setWallpaperHabitSet(v);
                  showToast(`${HABIT_SETS.find(h => h.key === v)?.label} habits`);
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
                  showToast(`Stats align: ${v === 'left' ? 'Left' : v === 'center' ? 'Center' : 'Right'}`);
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
                  { key: "weeks", label: "Weeks" },
                  { key: "month", label: "Month Cal" },
                  { key: "year", label: "Year" },
                  { key: "goals", label: "Goals" },
                ]}
                value={wallpaperGridStyle}
                onChange={(v) => {
                  setWallpaperGridStyle(v as any);
                  showToast(`${v === 'weeks' ? 'Weeks' : v === 'month' ? 'Month Cal' : v === 'year' ? 'Year' : 'Goals'} layout`);
                }}
                itemWidth={95}
                fontSizeClass="text-[14px]"
              />
            </div>
          )}

          {activeSettingTab === "size" && wallpaperGridStyle === "weeks" && (
            <div className="w-full animate-fade-in-right">
              <WheelPicker
                options={GRID_SIZES.map(w => ({ key: w, label: w }))}
                value={previewWeeks}
                onChange={setPreviewWeeks}
                itemWidth={55}
                fontSizeClass="text-[18px]"
              />
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <main
      data-theme={theme}
      className="fixed inset-0 flex h-full w-full justify-center bg-[var(--backdrop)] overflow-hidden"
    >
      {/* Main app container - 100% Full Edge-to-Edge Responsive */}
      <div className="relative flex h-full w-full flex-col bg-canvas pt-safe pb-safe overflow-hidden">
        <div
          data-throttle={throttled ? "1" : "0"}
          className="relative flex h-full w-full flex-1 flex-col overflow-hidden bg-canvas"
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

          {/* Liquid drifting blobs — animated ambient light */}
          {theme === "dark" && activeTab !== "consistency" && (
            <>
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
            </>
          )}

          {/* Photographic Peak Background for Consistency Tab */}
          {activeTab === "consistency" && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              <img
                src="/photo.jpg"
                alt=""
                className="w-full h-full object-cover opacity-20 grayscale"
                style={{
                  maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
                  objectPosition: "center top"
                }}
              />
            </div>
          )}

          {/* Top-Center Brand Icon & Auto-Expanding Title Pill, plus Profile Button */}
          <div className="absolute top-4 left-0 right-0 z-40 flex items-center justify-between px-4 pointer-events-none">
            {/* Spacer to maintain true center */}
            <div className="w-9" />

            {/* Themes Window (Only visible in wallpaper tab, positioned at the top) */}
            {activeTab === "wallpaper" && (
              <div className="absolute top-[60px] left-0 right-0 flex justify-center z-30 pointer-events-none px-4">
                {(() => {
                  const wt = wallpaperThemeOf(wallpaperTheme, theme);
                  const isBrightTheme = wt.bg === "#f5f5f5" || (wt.bg as string) === "#ffffff";
                  return (
                    <div
                      className={`w-full max-w-[500px] pointer-events-auto liquid-glass rounded-[32px] shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col items-center overflow-hidden ${drawerOpen ? "max-h-[240px]" : "max-h-[48px]"
                        }`}
                    >
                      {/* Content (First, so it expands downwards from the top) */}
                      <div className={`w-full overflow-x-auto hide-scrollbar snap-x transition-opacity duration-300 ${drawerOpen ? "opacity-100 p-4 pt-6" : "opacity-0 h-0"}`}>
                        <div className={`flex min-w-max gap-6 items-start px-2 ${isBrightTheme
                            ? "[&_*]:!text-black [&_[role=slider]]:!border-black/30"
                            : "[&_*]:!text-white [&_[role=slider]]:!border-white/30"
                          }`}>
                          {renderSettingsMenu()}
                        </div>
                      </div>

                      {/* Handle (At the bottom of the drawer) */}
                      <div
                        className={`w-full flex justify-center items-center shrink-0 transition-all duration-500 cursor-pointer ${drawerOpen ? "h-6 pb-3" : (isBrightTheme ? "h-12 hover:bg-white/70" : "h-12 hover:bg-black/70")
                          }`}
                        onPointerDown={(e) => {
                          toolbarDragStartY.current = e.clientY;
                          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { }
                        }}
                        onPointerMove={(e) => {
                          if (toolbarDragStartY.current === null) return;
                          const dy = e.clientY - toolbarDragStartY.current;
                          // Inverted drag logic: drag DOWN to open, drag UP to close
                          if (drawerOpen && dy < -40) {
                            setDrawerOpen(false);
                            toolbarDragStartY.current = null;
                          } else if (!drawerOpen && dy > 40) {
                            setDrawerOpen(true);
                            toolbarDragStartY.current = null;
                          }
                        }}
                        onPointerUp={(e) => {
                          if (toolbarDragStartY.current !== null) {
                            const dy = e.clientY - toolbarDragStartY.current;
                            if (Math.abs(dy) < 10 && !drawerOpen) {
                              setDrawerOpen(true);
                            } else if (Math.abs(dy) < 10 && drawerOpen) {
                              setDrawerOpen(false);
                            }
                            toolbarDragStartY.current = null;
                          }
                          try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
                        }}
                      >
                        <div className={`w-14 h-1.5 rounded-full ${isBrightTheme ? "bg-black/30" : "bg-white/30"}`} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (toast?.action) {
                  toast.action.onClick();
                  if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                  setToast(null);
                  return;
                }
                if (showTitlePill) {
                  setStreakOpen(true);
                } else {
                  setShowTitlePill(true);
                  if (titlePillTimerRef.current) window.clearTimeout(titlePillTimerRef.current);
                  titlePillTimerRef.current = window.setTimeout(() => {
                    setShowTitlePill(false);
                    titlePillTimerRef.current = null;
                  }, 2000);
                }
              }}
              className={`pointer-events-auto flex items-center justify-center rounded-full border border-[color:var(--hairline-mid)] p-1 pl-1 text-xs font-semibold text-ink backdrop-blur-xl shadow-lg transition-all duration-500 ease-out active:scale-95 ${showTitlePill ? "gap-2 pr-3.5 bg-canvas text-ink ring-1 ring-ink/10" : "gap-0 pr-1 bg-canvas/85"
                }`}
              aria-label="App logo and section title"
            >
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full overflow-hidden relative">
                {showTitlePill ? (
                  <div className="absolute inset-0 bg-ink/10 rounded-full flex items-center justify-center animate-pulse">
                    <img src="/icon.png" alt="" className={`h-full w-full object-contain object-center filter drop-shadow-sm scale-105 ${(wallpaperThemeOf(wallpaperTheme, theme).bg === "#f5f5f5" || (wallpaperThemeOf(wallpaperTheme, theme).bg as string) === "#ffffff") ? "invert" : ""
                      }`} />
                  </div>
                ) : (
                  <img
                    src="/icon.png"
                    alt="Grain logo"
                    className={`h-full w-full object-contain object-center filter drop-shadow-sm scale-105 transition-all duration-500 ${(wallpaperThemeOf(wallpaperTheme, theme).bg === "#f5f5f5" || (wallpaperThemeOf(wallpaperTheme, theme).bg as string) === "#ffffff") ? "invert" : ""
                      }`}
                  />
                )}
              </div>
              <span
                className={`overflow-hidden transition-all duration-500 ease-out flex items-center gap-2 ${showTitlePill ? "max-w-[240px] opacity-100" : "max-w-0 opacity-0"
                  }`}
              >
                <span className="h-3.5 w-px bg-[color:var(--hairline-mid)] shrink-0 opacity-70" />
                <span className="text-mute font-medium text-[11px] leading-none shrink-0 whitespace-nowrap flex items-center">
                  {activeTab === "today"
                    ? `Daily habits · ${totalStreak}d streak`
                    : activeTab === "consistency"
                      ? `Consistency · ${totalStreak}d streak`
                      : activeTab === "myday"
                        ? "My Day"
                        : activeTab === "goal"
                          ? "Your goals"
                          : "Live wallpaper"}
                </span>
              </span>
            </button>

            {/* Context Pill (Dynamic Island) */}
            <div className={`absolute left-1/2 -translate-x-1/2 top-[env(safe-area-inset-top,24px)] transition-all duration-500 ${toast ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 -translate-y-8 pointer-events-none'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <button
                onClick={() => {
                  if (toast?.action?.onClick) toast.action.onClick();
                }}
                className="pointer-events-auto flex h-10 items-center justify-center rounded-full bg-black border border-white/10 shadow-[0_16px_32px_rgba(0,0,0,0.4)] px-5 transition-all active:scale-95"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {toast && (
                    <>
                      <span className="font-bold text-[13px] leading-none shrink-0 whitespace-nowrap text-white">
                        {toast.msg}
                      </span>
                      {toast.action && (
                        <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                          {toast.action.label}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Profile Button (Top Right) */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-on-ink shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition active:scale-95 hover:scale-105"
            >
              {user?.email?.[0]?.toUpperCase() || "U"}
            </button>
          </div>




          <div
            ref={swipeContainerRef}
            className="relative flex flex-1 w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none"
            style={{ touchAction: "pan-y", scrollBehavior: "smooth" }}
          >



            {/* TAB 1: TODAY */}
            <div
              data-tab-id="today"
              className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-28"
              ref={activeTab === "today" ? scrollRef : undefined}
            >
              <div className="space-y-4 pt-16">

                <div className="flex justify-start px-5">
                  <button
                    onClick={() => setSwipeMode(true)}
                    className="flex items-center gap-1.5 rounded-full card-soft bg-[color:var(--canvas-soft)] px-3 py-1.5 text-xs font-bold text-ink shadow-sm transition hover:bg-ink/5"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Focus Mode
                  </button>
                </div>

                {/* Unified Hero: streak + ring + date selector */}
                <TodayHero
                  streak={totalStreak}
                  rate={rate}
                  done={doneCount}
                  total={totalCount}
                  nextHabit={(() => {
                    for (const q of QUADRANT_ORDER) {
                      const idx = habits[q].findIndex((h) => !h.done);
                      if (idx !== -1) return { q, i: idx, habit: habits[q][idx] as any };
                    }
                    return null;
                  })()}
                  onCompleteNext={(q: Quadrant, i: number) => toggleDone(q, i)}
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
                                  if (!isTodayDate) showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                                }}
                                className={`flex flex-col items-center gap-1 transition ${active ? "text-ink" : "text-body hover:text-ink"}`}
                              >
                                <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "opacity-100" : "opacity-40"}`}>
                                  {shortDay(date)}
                                </span>
                                <span className={`font-display text-lg font-black tabular-nums ${active ? "underline decoration-2 underline-offset-4" : ""}`}>
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
                                  if (!isTodayDate) showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                                }}
                                className={`flex flex-col items-center justify-center h-14 w-12 transition ${active
                                  ? "bg-ink text-[color:var(--canvas)] scale-110 shadow-lg"
                                  : "text-mute hover:text-ink hover:bg-canvas-soft"
                                  }`}
                              >
                                <span className={`text-[9px] font-black uppercase tracking-widest ${active ? "opacity-90" : ""}`}>
                                  {shortDay(date)}
                                </span>
                                <span className={`font-display text-xl font-black tabular-nums mt-0.5`}>
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
                                  if (!isTodayDate) showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                                }}
                                className={`flex flex-col items-center justify-center p-2 font-mono transition ${active
                                  ? "bg-ink text-[color:var(--canvas)]"
                                  : "text-body hover:bg-ink/10"
                                  }`}
                              >
                                <span className="text-[10px] uppercase font-bold tracking-tighter">
                                  {active ? `[${shortDay(date)}]` : shortDay(date)}
                                </span>
                                <span className="text-sm font-bold mt-1">
                                  {date.getDate().toString().padStart(2, '0')}
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
                  {totalCount === 0 ? (
                    /* ── Empty state: invitation + ghost card ── */
                    <div className="flex flex-col items-center gap-4 py-8">
                      {/* Ghost habit card */}
                      <div
                        className="animate-breathe w-full rounded-2xl border-2 border-dashed border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--canvas)_50%,transparent)] backdrop-blur-2xl shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_15%,transparent),0_8px_24px_rgba(0,0,0,0.2)] p-4 flex items-center gap-3.5 cursor-pointer transition-all hover:bg-[color:color-mix(in_srgb,var(--canvas)_65%,transparent)] hover:border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)]"
                        onClick={() => setModalOpen(true)}
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)]">
                          <Plus className="h-4 w-4 text-ink" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">Tap to add your first habit</p>
                          <p className="text-[11px] text-body mt-0.5">Your streak starts with one check ✓</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {QUADRANT_ORDER.flatMap((q) =>
                        habits[q].map((h, i) => (
                          <HabitCard
                            key={`${q}-${i}-${(h as any).id || h.name}`}
                            habit={h}
                            quadrant={q}
                            index={i}
                            onToggle={toggleDone}
                            onOpenDetail={(quad, idx) => {
                              setDetail({ q: quad, i: idx });
                              setNoteDraft("");
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* TAB 2: CONSISTENCY */}
            <div
              data-tab-id="consistency"
              className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-28"
              ref={activeTab === "consistency" ? scrollRef : undefined}
            >
              <div>
                <ConsistencyTab
                  heatmap={heatmap}
                  selectedHabit={selectedHabit}
                  setSelectedHabit={setSelectedHabit}
                  doneCount={doneCount}
                  totalCount={totalCount}
                  totalStreak={totalStreak}
                  rate={rate}
                  weeklyInsights={weeklyInsights}
                  showToast={showToast}
                  onOpenWeeklyReview={() => setWeeklyReviewOpen(true)}
                />
              </div>
            </div>

            {/* TAB 3: MY DAY */}
            <div
              data-tab-id="myday"
              className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-28"
              ref={activeTab === "myday" ? scrollRef : undefined}
            >
              <div className="pt-16 pb-32">
                <section className="px-5">
                  {totalCount === 0 ? (
                    <div className="liquid-glass specular flex flex-col items-center justify-center gap-3 px-5 py-10 text-center rounded-3xl">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] border border-[color:color-mix(in_srgb,var(--accent)_15%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]">
                        <Sparkles className="h-5 w-5 text-ink" />
                      </div>
                      <div>
                        <p className="font-display text-base font-bold text-ink">No habits yet</p>
                        <p className="mt-1 max-w-[240px] text-[12px] text-body">
                          Add your first habit to start a streak. It'll show up here in your daily routine.
                        </p>
                      </div>
                      <button
                        onClick={() => setModalOpen(true)}
                        className="pill mt-2 flex items-center gap-1.5 bg-ink px-5 py-2.5 text-[13px] font-semibold text-on-ink shadow-lg active:scale-95 transition"
                        data-lg-press
                      >
                        <Plus className="h-4 w-4" strokeWidth={3} /> Create habit
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {TIME_ORDER.map((timeKey) => {
                        const timeHabits = flatHabits.filter(h =>
                          h.time === timeKey ||
                          (!h.time && timeKey === "any")
                        );

                        if (timeHabits.length === 0) return null;

                        const timeIcons = {
                          morning: <Sunrise className="w-[18px] h-[18px] text-[color:var(--brand)]" />,
                          afternoon: <Sun className="w-[18px] h-[18px] text-[color:var(--brand)]" />,
                          evening: <Moon className="w-[18px] h-[18px] text-[color:var(--brand)]" />,
                          any: <Infinity className="w-[18px] h-[18px] text-[#3b82f6]" />
                        };

                        const timeTitles = {
                          morning: "Morning",
                          afternoon: "Afternoon",
                          evening: "Evening",
                          any: "Anytime"
                        };

                        return (
                          <div key={timeKey} className="liquid-glass specular relative flex w-full flex-col overflow-hidden rounded-[24px] border border-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_20%,transparent),0_8px_32px_rgba(0,0,0,0.3)] transition-all">
                            <div className="flex items-center justify-between px-4 py-3 text-left">
                              <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                                {timeIcons[timeKey]}
                                {timeTitles[timeKey]}
                              </h3>
                              <span className="text-[11px] font-medium tabular-nums text-mute">
                                {timeHabits.filter(h => h.done).length}/{timeHabits.length}
                              </span>
                            </div>
                            <div className="px-3 pb-3 pt-0 space-y-1.5">
                              {timeHabits.map((h, i) => (
                                <HabitRow
                                  key={h.id}
                                  habit={h}
                                  justDone={false}
                                  menuOpen={openMenuId === h.id}
                                  onMenuToggle={() => setOpenMenuId(openMenuId === h.id ? null : h.id)}
                                  onMenuClose={() => setOpenMenuId(null)}
                                  onToggle={() => toggleHabitDone(h.id)}
                                  onRest={() => setHabitRestDay(h.id)}
                                  onPin={() => { togglePin(h.quadrant, habits[h.quadrant].findIndex(hx => hx.id === h.id)); setOpenMenuId(null); }}
                                  onDelete={() => { deleteHabit(h.quadrant, habits[h.quadrant].findIndex(hx => hx.id === h.id)); setOpenMenuId(null); }}
                                  onMove={() => { }}
                                  onEdit={() => setEditHabitTarget({ q: h.quadrant, i: habits[h.quadrant].findIndex(hx => hx.id === h.id) })}
                                  onAdjust={(dir) => adjustValue(h.quadrant, habits[h.quadrant].findIndex(hx => hx.id === h.id), dir)}
                                  onSetValue={(val) => setHabitValue(h.id, val, h.target ?? 1)}
                                  onOpenDetail={() => {
                                    setDetail({ q: h.quadrant, i: habits[h.quadrant].findIndex(hx => hx.id === h.id) });
                                    setNoteDraft("");
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="h-6" />

            {/* Goal Tab */}
            <div
              data-tab-id="goal"
              className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative scrollbar-none pb-28"
              ref={activeTab === "goal" ? scrollRef : undefined}
            >
              <div className="pt-16 pb-32">
                <GoalTab
                goals={goals}
                onDelete={async (id) => {
                  if (id === activeGoalId) {
                    setActiveGoalId(null);
                    if (userId) {
                      await updateDoc(doc(getFirestore(), "users", userId), {
                        "prefs.activeGoalId": null
                      }).catch(console.error);
                    }
                  }
                  await deleteGoal(userId!, id);
                }}
                onSetActiveGoal={async (id) => {
                  setActiveGoalId(id);
                  if (userId) {
                    await updateDoc(doc(getFirestore(), "users", userId), {
                                      "prefs.activeGoalId": id
                    }).catch(console.error);
                  }
                }}
              />
            </div>
            </div>

            {/* TAB 5: WALLPAPER */}
            <div
              data-tab-id="wallpaper"
              className="w-full h-full flex-shrink-0 snap-start snap-always overflow-hidden relative"
              ref={activeTab === "wallpaper" ? scrollRef : undefined}
            >
              <div className="absolute inset-0 z-10 flex flex-col bg-black pointer-events-auto">

                {/* Controls overlay at top of Full Screen Preview */}
                <div className="absolute top-[env(safe-area-inset-top,24px)] mt-4 left-0 right-0 flex items-center justify-between px-6 z-50 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="pointer-events-auto flex items-center justify-center h-10 w-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white cursor-pointer active:scale-95 transition-all hover:bg-black/60 shadow-lg"
                    >
                      <ImagePlus size={20} />
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} onClick={(e) => e.stopPropagation()} />
                    {wallpaperTheme === "custom" && (
                      <button
                        type="button"
                        onClick={() => setIsMovingPhoto(prev => !prev)}
                        className={`pointer-events-auto flex items-center justify-center h-10 px-4 rounded-full backdrop-blur-md border border-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg ${isMovingPhoto ? "bg-white text-black" : "bg-black/40 hover:bg-black/60"
                          }`}
                      >
                        {isMovingPhoto ? "Done Moving" : "Move Photo"}
                      </button>
                    )}
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
                    color: wallpaperThemeOf(wallpaperTheme, theme).fg,
                  }}
                >
                  {/* Snapping Crosshairs */}
                  {isDraggingWallpaper && (wallpaperGridStyle === "month" || wallpaperGridStyle === "year") && (
                    <>
                      <div className={`absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 z-0 transition-colors duration-200 ${wallpaperOffset.x === 0 ? "bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-white/20"}`} />
                      <div className={`absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 z-0 transition-colors duration-200 ${wallpaperOffset.y === 0 ? "bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-white/20"}`} />
                    </>
                  )}

                  {wallpaperTheme === "custom" && wallpaperCustomPhoto && (
                    <>
                      <img
                        ref={wallpaperPhotoRef}
                        src={wallpaperCustomPhoto}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform"
                        style={{
                          transform: `translate(${wallpaperPhotoOffset.x}px, ${wallpaperPhotoOffset.y}px) scale(${wallpaperPhotoScale})`
                        }}
                        alt=""
                      />
                      <div className="absolute inset-0 pointer-events-none bg-black transition-opacity" style={{ opacity: wallpaperPhotoOverlay }} />
                    </>
                  )}
                  {/* Overlay hint */}
                  <div className={`absolute top-[env(safe-area-inset-top,24px)] mt-24 left-0 right-0 flex justify-center pointer-events-none opacity-50 z-40 transition-opacity duration-300 ${isMovingPhoto ? "opacity-100" : ""}`}>
                    <span className="bg-black/50 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                      {isMovingPhoto ? "Drag to reposition photo · Pinch to resize" : "Drag to reposition · Pinch to resize"}
                    </span>
                  </div>

                  {/* Draggable container */}
                  <div
                    ref={wallpaperGridRef}
                    className="relative w-full h-full flex flex-col items-center justify-center cursor-move"
                    style={{ transform: `translate(${wallpaperOffset.x}px, ${wallpaperOffset.y}px) scale(${wallpaperScale})`, touchAction: "none" }}
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
                          const monthName = new Date(year, m, 1).toLocaleString("default", { month: "short" });
                          const daysInMonth = new Date(year, m + 1, 0).getDate();
                          const firstDow = (new Date(year, m, 1).getDay() + 6) % 7; // 0=Mon
                          return { m, monthName, daysInMonth, firstDow };
                        });
                        const totalDays = new Date(year, 12, 0).getDate() + (new Date(year, 0, 1).getDay());
                        const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
                        const dayOfYear = Math.floor((today.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1;
                        const daysLeft = daysInYear - dayOfYear;
                        const pct = Math.round((dayOfYear / daysInYear) * 100);
                        const themeColors = wallpaperTokens(wallpaperTheme, gridColorTheme, theme);

                        // Build a per-day completion map from heatmap
                        // heatmap is 52 weeks × 7 days, starting from heatmapStartDate
                        const startDate = new Date(today);
                        startDate.setDate(startDate.getDate() - (52 * 7 - 1));
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
                            <div className="grid gap-x-6 gap-y-7" style={{ gridTemplateColumns: "repeat(3, max-content)", justifyContent: "center" }}>
                              {months.map(({ m, monthName, daysInMonth, firstDow }) => {
                                const cells = [];
                                // leading empty cells
                                for (let e = 0; e < firstDow; e++) {
                                  cells.push(<div key={`e-${e}`} style={{ width: 8, height: 8 }} />);
                                }
                                for (let d = 1; d <= daysInMonth; d++) {
                                  const isToday = today.getFullYear() === year && today.getMonth() === m && today.getDate() === d;
                                  const isFuture = new Date(year, m, d) > today;
                                  const key = `${year}-${m}-${d}`;
                                  const v = completionMap.get(key) ?? 0;
                                  let bg: string;
                                  if (isFuture) {
                                    bg = "rgba(255,255,255,0.04)";
                                  } else {
                                    bg = v === 0 ? themeColors.empty : v === 1 ? themeColors.low : v === 2 ? themeColors.mid : themeColors.hi;
                                  }
                                  cells.push(
                                    <div
                                      key={d}
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 2,
                                        background: bg,
                                        border: isToday ? `1px solid ${themeColors.accent}` : undefined,
                                        boxShadow: isToday ? `0 0 6px ${themeColors.accent}40` : undefined,
                                      }}
                                    />
                                  );
                                }
                                return (
                                  <div key={m} className="flex flex-col gap-1.5">
                                    <span style={{ fontSize: 9, opacity: 0.55, letterSpacing: "0.02em", fontWeight: 500, textTransform: "capitalize", paddingLeft: 1 }}>
                                      {monthName}
                                    </span>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 8px)", gap: 3 }}>
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
                      /* ── Month Calendar View (reference-style) ── */
                      (() => {
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = today.getMonth();
                        const monthName = today.toLocaleString("default", { month: "long" }).toUpperCase();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon
                        const fg = wallpaperThemeOf(wallpaperTheme, theme).fg;
                        const themeColors = wallpaperTokens(wallpaperTheme, gridColorTheme, theme);

                        // Build completion map
                        const startDate = new Date(today);
                        startDate.setDate(startDate.getDate() - (52 * 7 - 1));
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
                        const cells: { day: number | null; isToday: boolean; isFuture: boolean; v: number }[] = [];
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
                          <div className="w-full flex flex-col px-6" style={{ paddingTop: "72px" }}>
                            {/* Month name */}
                            <div className="text-center mb-6" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.25em", color: fg, opacity: 0.7 }}>
                              {monthName}
                            </div>

                            {/* Day headers */}
                            <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`, gap: `${GAP}px`, marginBottom: 8 }}>
                              {DAY_HEADERS.map((h) => (
                                <div key={h} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: fg, opacity: 0.4 }}>
                                  {h}
                                </div>
                              ))}
                            </div>

                            {/* Day grid */}
                            <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`, gap: `${GAP}px` }}>
                              {cells.map((cell, idx) => {
                                if (cell.day === null) {
                                  return <div key={idx} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                                }
                                const textOpacity = cell.isFuture ? 0.25 : cell.isToday ? 1 : 0.85;

                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      width: CELL_SIZE,
                                      height: CELL_SIZE,
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      position: "relative",
                                    }}
                                  >
                                    {/* Today circle ring */}
                                    {cell.isToday && (
                                      <div style={{
                                        position: "absolute",
                                        inset: 3,
                                        borderRadius: "50%",
                                        border: `1.5px solid ${themeColors.accent}`,
                                        opacity: 0.9,
                                      }} />
                                    )}

                                    {/* Day number */}
                                    <span style={{
                                      fontSize: 15,
                                      fontWeight: cell.isToday ? 700 : 400,
                                      color: fg,
                                      opacity: textOpacity,
                                      lineHeight: 1,
                                      fontVariantNumeric: "tabular-nums",
                                    }}>
                                      {cell.day}
                                    </span>

                                    {/* Completion dot */}
                                    {!cell.isFuture && (
                                      <div style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        background: cell.isToday ? themeColors.accent : (cell.v === 0 ? themeColors.empty : cell.v === 1 ? themeColors.low : cell.v === 2 ? themeColors.mid : themeColors.hi),
                                        marginTop: 3,
                                      }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : wallpaperGridStyle === "weeks" ? (
                      /* ── Weeks Heatmap View (existing) ── */
                      <div
                        className={`grid mt-16 ${wallpaperSync ? "" : "opacity-60"}`}
                        style={(() => {
                          const N = previewWeeks * 7;
                          const availW = typeof window !== "undefined" ? window.innerWidth - 48 : 342;
                          const availH = typeof window !== "undefined" ? window.innerHeight - 240 : 600;
                          const gapSize = previewWeeks > 26 ? 2 : 3;
                          let bestSize = 6;
                          let bestCols = 7;

                          // Find the largest cell size that fits N cells into the screen.
                          for (let s = 48; s >= 6; s--) {
                            let c = Math.floor((availW + gapSize) / (s + gapSize));
                            let r = Math.floor((availH + gapSize) / (s + gapSize));
                            if (c * r >= N) {
                              bestSize = s;
                              bestCols = c;
                              break;
                            }
                          }

                          const borderRadius = bestSize > 12 ? 4 : 2;

                          return {
                            gridTemplateColumns: `repeat(${bestCols}, max-content)`,
                            gridAutoFlow: "row",
                            justifyContent: "center",
                            alignContent: "center",
                            gap: `${gapSize}px`,
                            "--wp-cell-size": `${bestSize}px`,
                            "--wp-cell-radius": `${borderRadius}px`
                          } as any;
                        })()}
                      >
                        {displayedHeatmap.slice(-previewWeeks).flatMap((col, ci) => {
                          const absCi = 52 - previewWeeks + ci;
                          return col.map((v, ri) => {
                            const isToday = absCi === TODAY_COL && ri === TODAY_ROW;
                            return (
                              <div
                                key={`${ci}-${ri}`}
                                className={`${isToday ? "animate-cell-flash ring-2 ring-inset ring-[color:var(--wp-accent)]" : ""}`}
                                style={{
                                  width: "var(--wp-cell-size)",
                                  height: "var(--wp-cell-size)",
                                  borderRadius: "var(--wp-cell-radius)",
                                  background:
                                    v === 0
                                      ? "var(--wp-empty)"
                                      : v === 1
                                        ? "var(--wp-low)"
                                        : v === 2
                                          ? "var(--wp-mid)"
                                          : "var(--wp-hi)",
                                }}
                              />
                            );
                          });
                        })}
                      </div>
                    ) : (
                      /* ── Stacked Goals View ── */
                      <div className={`flex flex-col items-center gap-12 mt-16 w-full ${wallpaperSync ? "" : "opacity-60"}`}>
                        {stackedGoals.length === 0 ? (
                          <div className="text-[14px] opacity-50 font-semibold uppercase tracking-widest text-center mt-20">
                            No active goals
                          </div>
                        ) : (
                          stackedGoals.map((sg) => (
                            <div key={sg.id} className="flex flex-col items-center w-full">
                              <div className="flex flex-wrap gap-1 justify-center px-4 mb-4 max-w-[320px] mx-auto">
                                {sg.heatmap && sg.heatmap.flatMap(col => col).map((v: number, i: number) => (
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
                                <span style={{ color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "11px" }}>
                                  {sg.currentStreak}d left - {sg.completionRate}%
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {wallpaperHabitSet !== "none" && wallpaperGridStyle === "weeks" && (
                      <div className="mt-12 flex flex-col items-center gap-2 opacity-80">
                        {(HABIT_SETS.find(s => s.key === wallpaperHabitSet)?.habits || []).map((h, i) => (
                          <span key={i} className="text-[12px] uppercase tracking-widest font-semibold">{h}</span>
                        ))}
                      </div>
                    )}

                    <div className={`mt-12 w-full px-12 text-[11px] font-semibold opacity-70 ${wallpaperStatsAlign === 'left' ? 'text-left' : wallpaperStatsAlign === 'right' ? 'text-right' : 'text-center'}`}>
                      {activeGoalId && goals.some(g => g.id === activeGoalId) ? (
                        <span style={{ color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, letterSpacing: "0.02em", fontSize: "11px" }}>
                          {displayedTotalStreak}d left - {displayedRate}%
                        </span>
                      ) : (
                        <span>
                          {displayedTotalStreak} day streak · {displayedRate}%
                        </span>
                      )}
                      <br />
                      <span className="opacity-50 mt-1 block">{wallpaperSync ? "LIVE SYNC ON" : "SNAPSHOT PAUSED"}</span>
                    </div>

                  </div> {/* End Draggable Container */}
                </div>

                {/* Controls overlay at bottom of Full Screen Preview */}
                <div className="absolute bottom-28 left-0 right-0 flex flex-col items-center justify-end z-50 animate-fade-in-up px-4 pointer-events-none">
                  {/* Live/Static Toggle moved to bottom */}
                  <div className="flex items-center rounded-full border border-[color:var(--hairline-mid)] p-1 bg-canvas/85 backdrop-blur-xl shadow-lg pointer-events-auto">
                    <button
                      onClick={() => applyWallpaper(false)}
                      className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-[12px] font-bold transition-all ${!wallpaperSync ? "text-mute hover:text-ink" : "bg-ink text-on-ink shadow-sm"}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${wallpaperSync ? "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-[color:var(--hairline-mid)]"}`} /> Live
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowStaticTargetSelector(true);
                      }}
                      className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-[12px] font-bold transition-all ${wallpaperSync ? "text-mute hover:text-ink" : "bg-ink text-on-ink shadow-sm"}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${!wallpaperSync ? "bg-[color:var(--canvas-softer)]" : "bg-[color:var(--hairline-mid)]"}`} /> Static
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Liquid Glass Bottom Navigation Bar */}
          <div className="absolute bottom-3 left-0 right-0 z-40 mx-4 pointer-events-none">
            <nav className="pointer-events-auto mx-auto flex max-w-[360px] items-center justify-center gap-1 rounded-full border border-[color:var(--hairline)] bg-canvas/40 p-1.5 backdrop-blur-2xl shadow-2xl specular relative overflow-hidden">
              {([
                { id: "today", label: "Today", icon: Flame },
                { id: "consistency", label: "Consistency", icon: CalendarDays },
                { id: "myday", label: "My Day", icon: Sun },
                { id: "goal", label: "Goals", icon: Target },
                { id: "wallpaper", label: "Wallpaper", icon: Wallpaper },
              ] as const).map((t) => {
                const active = activeTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      switchTab(t.id as AppTab);
                      try { navigator.vibrate?.(10); } catch { }
                    }}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 px-1 text-[11px] font-medium transition-all duration-200 ${active
                      ? "bg-ink text-on-ink shadow-lg scale-105"
                      : "text-body hover:text-ink active:scale-95"
                      }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 1.75} />
                    <span className="text-[10px] leading-none">{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* FAB */}
          {activeTab === "today" && (
            <button
              onClick={() => setModalOpen(true)}
              className="absolute bottom-20 right-5 z-30 mb-safe grid h-14 w-14 place-items-center rounded-full bg-ink text-on-ink shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4)] transition active:scale-95 hover:scale-105"
              aria-label="Add habit"
            >
              <Plus className="h-6 w-6" strokeWidth={2.25} />
            </button>
          )}

          {/* Toast removed (merged into title pill) */}

          {/* Fullscreen wallpaper lock-screen preview removed */}



          {/* Swipe Mode Full Screen */}
          {swipeMode && (
            <SwipeModeView
              habits={habits}
              onClose={() => setSwipeMode(false)}
              onToggleDone={(habitId) => {
                for (const q of QUADRANT_ORDER) {
                  const i = habits[q].findIndex(h => h.id === habitId);
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
          )}

          {/* Settings Full Screen */}
          {settingsOpen && (
            <div className="fixed inset-0 z-40 flex flex-col bg-canvas/80 backdrop-blur-3xl animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <div>
                  <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Settings</h1>
                  <p className="text-xs font-medium text-mute mt-0.5">Preferences & data</p>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-canvas-soft text-ink transition hover:bg-[color:var(--surface-pressed)] active:scale-95"
                  aria-label="Close settings"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-none pb-safe">
                {/* Profile Section */}
                <div className="rounded-3xl p-[1px] bg-gradient-to-br from-[color:var(--hairline-mid)] via-transparent to-[color:var(--hairline-mid)] animate-profile-card shadow-lg">
                  <div className="card-soft relative overflow-hidden p-4 rounded-3xl bg-canvas/60 backdrop-blur-2xl border border-[color:var(--hairline)]">
                    <div className="flex items-center gap-5">
                      <div className="relative animate-profile-avatar">
                        <div className="grid h-20 w-20 place-items-center rounded-full bg-ink text-on-ink font-display text-2xl font-bold shadow-lg">
                          {profile.initials}
                        </div>
                        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-[12px] font-bold text-white ring-4 ring-[color:var(--canvas)] animate-pulse">
                          <Flame className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="font-display truncate text-xl font-bold text-ink">{profile.name}</h2>
                          <span className="rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ink border border-indigo-500/30">
                            Pro
                          </span>
                        </div>
                        <p className="truncate text-sm text-body mt-1">{profile.tagline}</p>
                      </div>
                      <button
                        onClick={() => setProfileEditOpen(true)}
                        className="chip-uber shrink-0 px-4 py-2 text-xs"
                        aria-label="Edit profile"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-[color:var(--canvas-softer)] p-2.5 text-center animate-profile-stat" style={{ animationDelay: "100ms" }}>
                        <p className="font-display text-2xl font-bold leading-none text-ink tabular-nums">{totalStreak}</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-body">Streak</p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--canvas-softer)] p-2.5 text-center animate-profile-stat" style={{ animationDelay: "160ms" }}>
                        <p className="font-display text-2xl font-bold leading-none text-ink tabular-nums">
                          {doneCount}<span className="text-body opacity-50 text-lg">/{totalCount}</span>
                        </p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-body">Today</p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--canvas-softer)] p-2.5 text-center animate-profile-stat" style={{ animationDelay: "220ms" }}>
                        <p className="font-display text-2xl font-bold leading-none text-ink tabular-nums">{rate}%</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-body">Rate</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
                  <button
                    type="button"
                    onClick={() => { setSettingsOpen(false); setAiCoachOpen(true); }}
                    className="w-full flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-canvas/60 backdrop-blur-2xl border border-[color:var(--hairline)] py-3.5 text-xs font-bold text-ink transition active:scale-95 hover:bg-ink/10 shadow-sm"
                    data-lg-press
                  >
                    <MessageSquare className="h-6 w-6" strokeWidth={2} /> Coach
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSettingsOpen(false); setBadgesOpen(true); }}
                    className="w-full flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-canvas/60 backdrop-blur-2xl border border-[color:var(--hairline)] py-3.5 text-xs font-bold text-ink transition active:scale-95 hover:bg-ink/10 shadow-sm"
                    data-lg-press
                  >
                    <Hexagon className="h-6 w-6" strokeWidth={2} /> Badges
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSettingsOpen(false); setShareStreakOpen(true); }}
                    className="w-full flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-canvas/60 backdrop-blur-2xl border border-[color:var(--hairline)] py-3.5 text-xs font-bold text-ink transition active:scale-95 hover:bg-ink/10 shadow-sm"
                    data-lg-press
                  >
                    <ArrowUpRight className="h-6 w-6" strokeWidth={2} /> Share
                  </button>
                </div>

                {/* Settings Rows */}
                <div className="relative z-10 rounded-3xl p-[1px] bg-gradient-to-br from-[color:var(--hairline-mid)] via-transparent to-[color:var(--hairline-mid)] animate-fade-in-up shadow-sm" style={{ animationDelay: "300ms" }}>
                  <div className="rounded-3xl bg-canvas/60 backdrop-blur-2xl border border-[color:var(--hairline)] divide-y divide-[color:var(--hairline)]">
                    <Row
                      label="Theme"
                      action={
                        <button
                          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                          className="pill bg-canvas-soft px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-ink"
                        >
                          {theme === "dark" ? "Dark" : "Light"}
                        </button>
                      }
                    />
                    <Row
                      label="Starter Packs & Walkthrough"
                      action={
                        <button
                          onClick={() => {
                            setSettingsOpen(false);
                            setOnboardingOpen(true);
                          }}
                          className="pill bg-canvas-soft px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/10 transition"
                        >
                          Explore
                        </button>
                      }
                    />
                    <Row
                      label="Live wallpaper sync"
                      action={
                        <Toggle
                          checked={wallpaperSync}
                          onChange={toggleWallpaperSync}
                          ariaLabel="Toggle live wallpaper sync"
                        />
                      }
                    />
                    <Row
                      label={
                        <span className="flex items-center gap-2">
                          <Bell className="h-4 w-4" /> Habit reminders
                        </span>
                      }
                      action={
                        <Toggle
                          checked={remindersOn}
                          onChange={async () => {
                            const next = !remindersOn;
                            setRemindersOn(next);
                            if (userId) {
                              updateUserProfile(userId, { remindersOn: next });
                            }
                            const ok = await scheduleDailyReminder(next);
                            if (next) {
                              showToast(ok ? "Reminders scheduled for 8:00 PM" : "Permission needed for reminders");
                            } else {
                              showToast("Reminders turned off");
                            }
                          }}
                          ariaLabel="Toggle reminders"
                        />
                      }
                    />
                    <Row
                      label="Date selector style"
                      action={
                        <div className="relative">
                          <button
                            onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                            className="pill bg-canvas-soft px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5"
                          >
                            {dateStyle}
                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                          </button>
                          {dateDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setDateDropdownOpen(false)} />
                              <div className="absolute right-0 top-full mt-2 w-32 rounded-xl bg-canvas shadow-xl border border-[color:var(--hairline-strong)] z-50 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-150">
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
                              </div>
                            </>
                          )}
                        </div>
                      }
                    />
                  </div>
                </div>

                {/* Danger / Data Actions */}
                <div className="space-y-2.5 pt-2 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
                  <div className="rounded-[1.25rem] p-[1px] bg-gradient-to-br from-[color:var(--hairline-mid)] via-transparent to-[color:var(--hairline-mid)] transition-all">
                    <button
                      data-lg-press
                      onClick={exportBackup}
                      className="flex w-full items-center justify-between rounded-[1.25rem] bg-canvas/60 backdrop-blur-2xl border border-[color:var(--hairline)] px-5 py-3.5 text-sm font-bold text-ink transition group hover:bg-ink/5 shadow-sm"
                    >
                      <span className="flex items-center gap-3">
                        <Download className="h-5 w-5" /> Backup & export data
                      </span>
                      <ArrowRight className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                  <div className="rounded-[1.25rem] p-[1px] bg-gradient-to-br from-[color:var(--hairline-mid)] via-transparent to-[color:var(--hairline-mid)] transition-all">
                    <button
                      data-lg-press
                      onClick={() => setResetConfirmOpen(true)}
                      className="flex w-full items-center justify-between rounded-[1.25rem] bg-canvas/60 backdrop-blur-2xl border border-[color:var(--hairline)] px-5 py-3.5 text-sm font-bold text-ink transition group hover:bg-ink/5 shadow-sm"
                    >
                      <span className="flex items-center gap-3">
                        <RotateCcw className="h-5 w-5" /> Reset today's progress
                      </span>
                      <ArrowRight className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                  <div className="rounded-[1.25rem] p-[1px] bg-gradient-to-br from-red-500/20 via-transparent to-red-500/10 transition-all">
                    <button
                      data-lg-press
                      onClick={() => setSignOutOpen(true)}
                      className="flex w-full items-center justify-between rounded-[1.25rem] bg-red-500/10 backdrop-blur-2xl border border-red-500/20 px-5 py-3.5 text-sm font-bold text-red-500 transition group hover:bg-red-500/20 shadow-sm"
                    >
                      <span className="flex items-center gap-3">
                        <LogOut className="h-5 w-5" /> Sign out
                      </span>
                      <ArrowRight className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                try { navigator.vibrate?.(18); } catch { }
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
              onClose={() => setProfileEditOpen(false)}
              onSave={async (next) => {
                try {
                  await saveProfile(next);
                } finally {
                  setProfileEditOpen(false);
                }
              }}
            />
          )}

          {streakOpen && (
            <SheetShell
              onClose={() => setStreakOpen(false)}
              title={`${totalStreak}-day streak`}
              subtitle="Overview"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{totalStreak}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-body">Current</p>
                  </div>
                  <div className="rounded-2xl bg-canvas-soft p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{bestStreak || "—"}</p>
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
                      const v = col[TODAY_ROW];
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
                    setStreakOpen(false);
                  }}
                  className="pill w-full bg-canvas-soft py-3 text-[13px] font-semibold text-ink"
                >
                  <Snowflake className="mr-1.5 inline h-3.5 w-3.5" /> Freeze today's streak
                </button>
                <button
                  onClick={() => setStreakOpen(false)}
                  className="btn-primary-uber w-full py-3 text-sm"
                >
                  Done
                </button>
              </div>
            </SheetShell>
          )}

          {editHabitTarget && (() => {
            const t = editHabitTarget;
            const h = habits[t.q]?.[t.i];
            if (!h) return null;
            return (
              <EditHabitSheet
                habit={h}
                quadrant={t.q}
                onClose={() => setEditHabitTarget(null)}
                onSave={async (patch, newQ) => {
                  try {
                    const updates: Partial<Omit<HabitDoc, "id" | "createdAt">> = { ...patch };
                    if (newQ && newQ !== t.q) updates.quadrant = newQ;
                    await updateHabitDoc(h.id, updates);
                    showToast("Habit updated");
                  } catch (err) {
                    console.error("Failed to update habit:", err);
                  } finally {
                    setEditHabitTarget(null);
                  }
                }}
                onDelete={() => {
                  deleteHabit(t.q, t.i);
                  setEditHabitTarget(null);
                }}
              />
            );
          })()}


          {/* Modal */}
          {modalOpen && (
            <SheetShell
              onClose={() => setModalOpen(false)}
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
                          className={`pill px-3 py-2.5 text-left text-xs font-medium transition ${active
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
                  <div className="flex flex-wrap gap-1.5">
                    {["Mind", "Health", "Growth", "Focus", "Fitness", "Admin"].map((c) => {
                      const active = newCategory === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setNewCategory(c)}
                          className={`pill px-3 py-1.5 text-[11px] font-medium transition ${active ? "bg-ink text-on-ink" : "liquid-input text-ink"
                            }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Time of day">
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: "any", label: "Anytime" },
                      { key: "morning", label: "Morning" },
                      { key: "afternoon", label: "Afternoon" },
                      { key: "evening", label: "Evening" },
                    ] as const).map((t) => {
                      const active = (newTime ?? "any") === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() =>
                            setNewTime(t.key === "any" ? undefined : (t.key as Habit["time"]))
                          }
                          className={`pill px-3 py-1.5 text-[11px] font-medium transition ${active ? "bg-ink text-on-ink" : "liquid-input text-ink"
                            }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Type">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewIsNumeric(false)}
                      className={`pill px-3 py-2.5 text-xs font-medium transition ${!newIsNumeric ? "bg-ink text-on-ink" : "liquid-input text-ink"
                        }`}
                    >
                      Binary
                    </button>
                    <button
                      onClick={() => setNewIsNumeric(true)}
                      className={`pill px-3 py-2.5 text-xs font-medium transition ${newIsNumeric ? "bg-ink text-on-ink" : "liquid-input text-ink"
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
                          className={`pill flex-1 px-3 py-2 text-xs font-medium transition ${active
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
                          style={{ background: c }}
                          className={`h-8 w-8 rounded-full border border-[color:var(--hairline)] transition ${i === newShade ? "ring-2 ring-ink ring-offset-2 ring-offset-[color:var(--canvas)]" : ""
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
                          className={`grid h-8 w-8 place-items-center rounded-lg transition ${i === newIcon ? "bg-ink text-on-ink" : "liquid-input text-ink"
                            }`}
                        >
                          <I className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <button
                  onClick={createHabit}
                  disabled={!newName.trim()}
                  className={`mt-2 flex w-full items-center justify-center rounded-xl bg-ink/10 backdrop-blur-[40px] border border-ink/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] py-3 text-[14px] font-bold text-ink shadow-lg active:scale-[0.98] transition ${!newName.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Create habit
                </button>
              </div>
            </SheetShell>
          )}

          {/* Habit detail modal */}
          {detail && (() => {
            const h = habits[detail.q][detail.i];
            if (!h) return null;
            // Build real 30-day completion history from Firestore completions
            const todayDate = new Date();
            return (
              <SheetShell
                onClose={() => setDetail(null)}
                title={h.name}
                subtitle={QUADRANTS[detail.q].title}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catClass(h.category)}`}>
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

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-canvas-soft px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-body">Current</div>
                      <div className="font-display text-xl font-bold text-ink">{h.streak}d</div>
                    </div>
                    <div className="rounded-2xl bg-canvas-soft px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-body">Best</div>
                      <div className="font-display text-xl font-bold text-ink">{h.best ?? h.streak}d</div>
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
                        const done = Boolean(entry && (entry.done || entry.restDay || entry.frozenStreak));
                        const restDay = Boolean(entry?.restDay);
                        const frozen = Boolean(entry?.frozenStreak);
                        return (
                          <div
                            key={i}
                            title={`${dk}: ${done ? (restDay ? "Rest day" : frozen ? "Streak frozen" : "Completed") : "Missed"}`}
                            className={`aspect-square rounded-md text-[9px] font-semibold grid place-items-center ${isFuture
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
                    <p className="mt-1 text-[10px] text-mute">Today shown in real-time · historical data via heatmap</p>
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
                      onClick={() => {
                        try {
                          // Persist note to Firestore first (fire and forget)
                          if (noteDraft.trim()) {
                            saveHabitNote(h.id, noteDraft.trim()).catch(err => console.error(err));
                          }
                          if (!h.done) {
                            toggleHabitDone(h.id).catch(err => console.error(err));
                          }
                          showToast(noteDraft.trim() ? "Note saved & marked done" : "Marked done");
                        } finally {
                          setDetail(null);
                        }
                      }}
                      className="btn-primary-uber py-3 text-xs"
                    >
                      Save
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      deleteHabit(detail.q, detail.i);
                      setDetail(null);
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
              onAddHabits={async (newHabits) => {
                for (const h of newHabits) {
                  await addHabit(h);
                }
                showToast(`Added ${newHabits.length} starter habits!`);
              }}
            />
          )}
        </div>
      </div>

      {showStaticTargetSelector && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end animate-fade-in pointer-events-auto p-4 pb-0">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 backdrop-blur-sm" 
            style={{ background: 'color-mix(in srgb, var(--ink) 30%, transparent)' }}
            onClick={() => setShowStaticTargetSelector(false)} 
          />
          {/* Content */}
          <div className="relative liquid-glass specular rounded-t-[32px] p-6 pb-12 shadow-2xl animate-sheet-slide-up border border-[color:var(--hairline-strong)]">
            <div className="mx-auto mt-0 mb-6 h-1.5 w-12 rounded-full bg-[color:var(--hairline-strong)]" />
            
            <h2 className="text-xl font-bold text-center text-[color:var(--ink)] mb-2">Set Static Wallpaper</h2>
            <p className="text-center text-[color:var(--mute)] mb-6 text-sm">Choose where to apply the wallpaper.</p>
            
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <button 
                onClick={() => { setShowStaticTargetSelector(false); applyWallpaper(true, 'home'); }} 
                className="w-full bg-[color:var(--canvas-soft)] text-[color:var(--ink)] font-bold h-14 rounded-2xl flex items-center justify-center border border-[color:var(--hairline)] active:scale-[0.98] transition-all hover:bg-[color:var(--canvas-softer)]"
              >
                Home Screen
              </button>
              <button 
                onClick={() => { setShowStaticTargetSelector(false); applyWallpaper(true, 'lock'); }} 
                className="w-full bg-[color:var(--canvas-soft)] text-[color:var(--ink)] font-bold h-14 rounded-2xl flex items-center justify-center border border-[color:var(--hairline)] active:scale-[0.98] transition-all hover:bg-[color:var(--canvas-softer)]"
              >
                Lock Screen
              </button>
              <button 
                onClick={() => { setShowStaticTargetSelector(false); applyWallpaper(true, 'both'); }} 
                className="w-full bg-ink text-on-ink font-bold h-14 rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all hover:opacity-90 shadow-lg"
              >
                Both Screens
              </button>
              
              <button 
                onClick={() => setShowStaticTargetSelector(false)}
                className="w-full mt-2 h-12 font-semibold text-[color:var(--mute)] active:text-[color:var(--ink)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SheetShell({
  onClose,
  title,
  subtitle,
  children,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const hapticFired = useRef(false);

  const DISMISS_THRESHOLD = 90;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    setIsDragging(true);
    hapticFired.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const deltaY = e.clientY - startY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
      if (deltaY >= DISMISS_THRESHOLD && !hapticFired.current) {
        hapticFired.current = true;
        try { navigator.vibrate?.(18); } catch { }
      }
    } else {
      setDragY(deltaY * 0.2);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { }

    if (dragY >= DISMISS_THRESHOLD) {
      onClose();
    }
    setDragY(0);
    setIsDragging(false);
    startY.current = null;
    hapticFired.current = false;
  };

  const backdropOpacity = Math.max(0.1, 1 - Math.min(0.75, dragY / 300));

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity"
      style={{ opacity: backdropOpacity }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate3d(0, ${Math.max(0, dragY)}px, 0)`,
          transition: isDragging ? "none" : "transform 250ms cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
        className="w-full max-h-[85vh] overflow-y-auto rounded-t-[24px] liquid-glass p-5 select-none animate-sheet-slide-up"
      >
        {/* Drag Handle & Header Drag Area */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="group cursor-grab active:cursor-grabbing touch-none pb-2"
        >
          <div
            className={`mx-auto mb-3 h-1.5 rounded-full transition-all duration-200 ${dragY >= DISMISS_THRESHOLD
              ? "w-20 bg-rose-500"
              : isDragging
                ? "w-16 bg-ink"
                : "w-12 bg-[color:var(--surface-pressed)] group-hover:bg-[color:var(--hairline-mid)]"
              }`}
          />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
              {subtitle && <p className="text-xs text-body">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}


function Row({ label, action }: { label: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-canvas-soft px-4 py-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      {action}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-lg-press
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ink/30 ${checked
        ? "bg-ink border-ink"
        : "bg-canvas border-[color:var(--hairline)]"
        }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full shadow-sm transition-all duration-200 ${checked
          ? "translate-x-[22px] bg-on-ink"
          : "translate-x-[3px] bg-ink"
          }`}
      />
    </button>
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass specular relative w-full max-w-[320px] overflow-hidden rounded-3xl p-6 text-center animate-modal-scale-enter"
      >
        {icon && (
          <div
            className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl ${destructive
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
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-body">{description}</p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            data-lg-press
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`pill w-full py-3 text-[14px] font-semibold transition ${destructive
              ? "bg-red-500 text-white hover:bg-red-500/90"
              : "bg-ink text-on-ink"
              }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            data-lg-press
            onClick={onClose}
            className="pill w-full border border-[color:var(--hairline)] bg-canvas-soft py-3 text-[14px] font-semibold text-ink"
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

function Stat({ label, value, pulseKey }: { label: string; value: string; pulseKey?: number | string }) {
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
  const { setNodeRef } = useDroppable({ id: q });
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
          <span className="text-[10px] font-medium tracking-wider text-mute">
            · {meta.sub}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium tabular-nums text-mute">
            {doneCount}/{visible.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-mute transition-transform duration-200 ${collapsed ? "-rotate-90" : "rotate-0"
              }`}
          />
        </div>
      </button>

      {/* Content Area */}
      {!collapsed && (
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
      )}
    </div>
  );
}

// ---------------- Habit Row (swipe-to-complete / rest) ----------------
export const HabitRow = memo(function HabitRow({
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
  onOpenDetail,
  onSetValue,
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
  const isNumeric = h.target !== undefined;
  const pct = isNumeric ? Math.min(100, ((h.value ?? 0) / (h.target ?? 1)) * 100) : 0;

  const dxRef = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const leftBgRef = useRef<HTMLDivElement>(null);
  const leftIconRef = useRef<SVGSVGElement>(null);
  const leftTextRef = useRef<HTMLSpanElement>(null);
  const rightBgRef = useRef<HTMLDivElement>(null);
  const rightIconRef = useRef<SVGSVGElement>(null);
  const rightTextRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const axisLocked = useRef<"x" | "y" | null>(null);
  const threshHit = useRef(false);
  const COMMIT = 88;
  const HAPTIC_AT = 60;

  const rubberband = (v: number) => {
    const abs = Math.abs(v);
    if (abs <= COMMIT) return v;
    const over = abs - COMMIT;
    const damped = COMMIT + over * (1 - over / (over + 140));
    return v < 0 ? -damped : damped;
  };

  const onDown = (e: React.PointerEvent) => {
    if (isNumeric) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axisLocked.current = null;
    threshHit.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMoveP = (e: React.PointerEvent) => {
    if (isNumeric || startX.current === null || startY.current === null) return;
    const rawX = e.clientX - startX.current;
    const rawY = e.clientY - startY.current;
    if (!axisLocked.current) {
      if (Math.abs(rawX) < 6 && Math.abs(rawY) < 6) return;
      axisLocked.current = Math.abs(rawX) > Math.abs(rawY) ? "x" : "y";
    }
    if (axisLocked.current !== "x") return;
    if (!dragging) setDragging(true);
    const val = rubberband(rawX);
    dxRef.current = val;

    requestAnimationFrame(() => {
      if (rowRef.current) {
        rowRef.current.style.transform = `translate3d(${val}px,0,0)`;
        rowRef.current.style.transition = 'none';
      }
      const swipeProgress = Math.min(1, Math.abs(val) / COMMIT);
      if (val > 0 && leftBgRef.current && leftIconRef.current && leftTextRef.current) {
        leftBgRef.current.style.opacity = val > 4 ? String(0.4 + swipeProgress * 0.6) : "0";
        leftBgRef.current.style.width = `${val + 8}px`;
        leftIconRef.current.style.transform = `scale(${0.85 + swipeProgress * 0.4})`;
        leftTextRef.current.textContent = swipeProgress >= 1 ? "Release" : "Done";
      } else if (val < 0 && rightBgRef.current && rightIconRef.current && rightTextRef.current) {
        rightBgRef.current.style.opacity = val < -4 ? String(0.4 + swipeProgress * 0.6) : "0";
        rightBgRef.current.style.width = `${-val + 8}px`;
        rightIconRef.current.style.transform = `scale(${0.85 + swipeProgress * 0.4})`;
        rightTextRef.current.textContent = swipeProgress >= 1 ? "Release" : "Rest";
      }
    });

    if (!threshHit.current && Math.abs(val) >= HAPTIC_AT) {
      threshHit.current = true;
      try { navigator.vibrate?.(18); } catch { }
    }
    if (threshHit.current && Math.abs(val) < HAPTIC_AT - 12) {
      threshHit.current = false;
    }
  };
  const onUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
    if (isNumeric) return;
    const wasDrag = axisLocked.current === "x" && Math.abs(dxRef.current) > 6;
    if (dxRef.current >= COMMIT) {
      if (!h.done) onToggle();
    } else if (dxRef.current <= -COMMIT) {
      onRest();
    }
    dxRef.current = 0;

    requestAnimationFrame(() => {
      if (rowRef.current) {
        rowRef.current.style.transform = 'translate3d(0,0,0)';
        rowRef.current.style.transition = 'transform 260ms cubic-bezier(.2,.9,.3,1.2)';
      }
      if (leftBgRef.current) { leftBgRef.current.style.opacity = "0"; leftBgRef.current.style.width = "8px"; }
      if (rightBgRef.current) { rightBgRef.current.style.opacity = "0"; rightBgRef.current.style.width = "8px"; }
    });

    setDragging(false);
    startX.current = null;
    startY.current = null;
    axisLocked.current = null;
    if (wasDrag) {
      // suppress click after drag
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (isNumeric) {
    const pct = Math.min(100, (((h.value ?? 0)) / (h.target || 1)) * 100);
    return (
      <div
        className="relative w-full rounded-[24px] liquid-glass overflow-hidden flex flex-col p-5 mb-2 cursor-pointer transition hover:bg-[color:var(--canvas-soft)]"
        onClick={onOpenDetail}
      >
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-ink/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-4 z-10">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink/5 shadow-[inset_0_0_20px_color-mix(in_srgb,var(--ink)_5%,transparent)]">
            <Droplets className="h-6 w-6 text-ink drop-shadow-[0_0_8px_color-mix(in_srgb,var(--ink)_40%,transparent)]" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="truncate text-sm font-bold tracking-widest text-ink uppercase">
              {h.name}
            </h3>
            <p className="truncate text-[11px] font-medium text-mute mt-0.5">
              {h.category}
            </p>
            {h.note && (
              <p className="mt-1 truncate text-[10px] italic text-mute/70">
                "{h.note}"
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 self-start pt-1">
            <button onClick={(e) => { e.stopPropagation(); onPin(); }} className={`grid h-7 w-7 place-items-center rounded-full transition ${h.pinned ? 'text-ink' : 'text-mute hover:bg-ink/10'}`}>
              <Pin className="h-3.5 w-3.5" fill={h.pinned ? "currentColor" : "none"} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMenuToggle(); }} className="grid h-7 w-7 place-items-center rounded-full text-mute hover:bg-ink/10">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-col items-center mt-6 z-10">
          <div className="flex items-baseline gap-1 text-ink">
            <input
              type="number"
              value={h.value === 0 ? "" : h.value}
              placeholder="0"
              min={0}
              step={h.step ?? 0.25}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) onSetValue?.(val);
              }}
              onBlur={(e) => {
                if (e.target.value === "") onSetValue?.(0);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-right font-bold text-xl w-16 outline-none appearance-none"
            />
            <span className="text-base font-semibold text-mute">/ {(h.target ?? 0).toFixed(1)} {h.unit}</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-mute uppercase mt-0.5 mb-4">
            Progress
          </span>

          <div className="w-full h-2.5 rounded-full bg-ink/10 shadow-inner relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ink shadow-[0_0_12px_color-mix(in_srgb,var(--ink)_40%,transparent)] transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {menuOpen && (
          <div className="absolute right-4 top-12 z-20 w-32 overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-canvas shadow-xl animate-fade-in">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); onMenuClose(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-canvas-soft">
              <Settings className="h-3 w-3" /> Edit
            </button>
            <button onClick={(e) => { e.stopPropagation(); onRest(); onMenuClose(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-canvas-soft">
              <Shield className="h-3 w-3" /> Rest day
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); onMenuClose(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-xl bg-transparent ${h.done ? "opacity-70" : ""
        } ${justDone ? "animate-sync-pulse" : ""}`}
    >
      {/* Swipe reveal backgrounds */}
      <div
        ref={leftBgRef}
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 rounded-l-xl pl-2 pr-2 text-[10px] font-semibold text-emerald-300 transition-opacity"
        style={{
          background: "color-mix(in oklab, oklch(0.72 0.15 155) 22%, transparent)",
          opacity: 0,
          width: 8,
          willChange: "width, opacity"
        }}
      >
        <Check
          ref={leftIconRef}
          className="h-3.5 w-3.5"
          strokeWidth={3}
          style={{ transform: "scale(0.85)" }}
        />
        <span ref={leftTextRef}>Done</span>
      </div>
      <div
        ref={rightBgRef}
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end gap-1 rounded-r-xl pl-2 pr-2 text-[10px] font-semibold text-sky-300 transition-opacity"
        style={{
          background: "color-mix(in oklab, oklch(0.72 0.13 235) 22%, transparent)",
          opacity: 0,
          width: 8,
          willChange: "width, opacity"
        }}
      >
        <span ref={rightTextRef}>Rest</span>
        <Shield
          ref={rightIconRef}
          className="h-3.5 w-3.5"
          style={{ transform: "scale(0.85)" }}
        />
      </div>

      {/* Static hover hints when idle */}
      {!dragging && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center gap-1 rounded-l-xl bg-emerald-500/15 pl-1.5 pr-2 text-[9px] font-semibold text-emerald-300 opacity-0 transition group-hover:flex group-hover:opacity-100">
            <Check className="h-3 w-3" strokeWidth={3} />
            <span>Swipe →</span>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-1 rounded-r-xl bg-sky-500/15 pl-2 pr-1.5 text-[9px] font-semibold text-sky-300 opacity-0 transition group-hover:flex group-hover:opacity-100">
            <span>← Rest</span>
            <Shield className="h-3 w-3" />
          </div>
        </>
      )}

      <div
        ref={rowRef}
        onPointerDown={onDown}
        onPointerMove={onMoveP}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={(e) => {
          if (Math.abs(dxRef.current) > 6) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onOpenDetail();
        }}
        style={{
          transform: 'translate3d(0,0,0)',
          transition: dragging ? "none" : "transform 260ms cubic-bezier(.2,.9,.3,1.2)",
          touchAction: "pan-y",
          willChange: "transform"
        }}
        className="relative flex cursor-pointer items-center gap-2 liquid-glass p-2 transition-[background] hover:bg-[color:var(--canvas-softer)] rounded-xl"
      >
        {isNumeric ? (
          <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[color:var(--hairline-mid)] text-ink">
            <Droplets className="h-3 w-3" />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${h.done
              ? "border-ink bg-ink text-on-ink"
              : "border-[color:var(--hairline-mid)] hover:border-ink"
              }`}
            aria-label={h.done ? `Undo ${h.name}` : `Mark ${h.name} done`}
          >
            {h.done && <Check className="h-3 w-3 animate-scale-in" strokeWidth={3} />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[11px] font-semibold leading-tight text-ink ${h.done && !isNumeric ? "line-through" : ""
              }`}
          >
            {h.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            <span className={`rounded-full px-1.5 py-px text-[8px] font-semibold ${catClass(h.category)}`}>
              {h.category}
            </span>
            {h.streak > 0 && (
              <span
                key={h.streak}
                className="flex items-center gap-0.5 rounded-full bg-ink px-1.5 py-px text-[8px] font-semibold text-on-ink animate-pop-badge"
              >
                {h.streak}d
              </span>
            )}
          </div>
          {h.note && (
            <p className="mt-1 truncate text-[10px] italic text-mute/70">
              "{h.note}"
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`grid h-6 w-6 place-items-center rounded-md transition ${h.pinned ? "text-ink" : "text-mute hover:text-ink"
              }`}
            aria-label="Pin to wallpaper"
          >
            <Pin className="h-3 w-3" fill={h.pinned ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-mute hover:text-ink"
            aria-label="More"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
      </div>



      {menuOpen && (
        <div className="absolute right-1 top-8 z-10 w-28 overflow-hidden rounded-lg border border-[color:var(--hairline)] bg-canvas shadow-xl animate-fade-in">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Settings className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRest(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Shield className="h-3 w-3" /> Rest day
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Sparkles className="h-3 w-3" /> Move
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); onMenuClose(); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-red-500 hover:bg-canvas-soft"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.habit === next.habit &&
    prev.justDone === next.justDone &&
    prev.menuOpen === next.menuOpen &&
    prev.onSetValue === next.onSetValue // This might change if the parent changes it inline, but usually safe.
  );
});

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

  const derivedInitials = (name || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const effectiveInitials = (initialsTouched ? initials : derivedInitials).slice(0, 2).toUpperCase() || "U";

  return (
    <SheetShell onClose={onClose} title="Edit profile" subtitle="Update how you show up in the app">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-canvas-soft p-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-on-ink font-display text-lg font-bold">
            {effectiveInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">{name || "Your name"}</p>
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
            data-lg-press
            onClick={onClose}
            className="pill w-full border border-[color:var(--hairline)] bg-canvas-soft py-3 text-sm font-semibold text-ink"
          >
            Cancel
          </button>
          <button
            data-lg-press
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
  const [isNumeric, setIsNumeric] = useState(habit.target !== undefined);
  const [target, setTarget] = useState<number>(habit.target ?? 1);
  const [unit, setUnit] = useState<string>(habit.unit ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const CATS = ["Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];
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
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`pill px-3 py-1.5 text-[11px] font-medium transition ${active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                      }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Priority quadrant">
            <div className="grid grid-cols-2 gap-2">
              {QUADRANT_ORDER.map((qq) => {
                const active = q === qq;
                return (
                  <button
                    key={qq}
                    onClick={() => setQ(qq)}
                    className={`pill px-3 py-2.5 text-left text-xs font-medium transition ${active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
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
                    className={`pill px-3 py-1.5 text-[11px] font-medium transition ${active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                      }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
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
              onClick={() => {
                const patch: Partial<Habit> = {
                  name: name.trim() || habit.name,
                  category,
                  time,
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
