const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Imports
const importsToAdd = `
import { useStore } from "../store/useStore";
import { TodayTab } from "../components/tabs/TodayTab";
import { ConsistencyTab } from "../components/tabs/ConsistencyTab";
import { MatrixTab } from "../components/tabs/MatrixTab";
import { WallpaperTab } from "../components/tabs/WallpaperTab";
import { EditHabitSheet } from "../components/modals/EditHabitSheet";
import { ProfileEditSheet } from "../components/modals/ProfileEditSheet";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
`;
content = content.replace('import { createFileRoute } from "@tanstack/react-router";', 'import { createFileRoute } from "@tanstack/react-router";\n' + importsToAdd);

// 2. Replace state definitions in Grain
const stateBlockMatch = `  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHabit, setSelectedHabit] = useState("All habits");
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wallpaperSync, setWallpaperSync] = useState(true);
  const [wallpaperState, setWallpaperState] = useState<WallpaperState>("idle");
  const [wallpaperSnapshot, setWallpaperSnapshot] = useState<number[][] | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>("q2");
  const [theme, setTheme] = useState<Theme>("dark");
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; onClick: () => void } } | null>(null);`;

const newStateBlock = `  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const timeFilter = useStore((s) => s.timeFilter);
  const isProfileOpen = useStore((s) => s.isProfileOpen);
  const setProfileOpen = useStore((s) => s.setProfileOpen);
  const editHabitTarget = useStore((s) => s.editHabitTarget);
  const setEditHabitTarget = useStore((s) => s.setEditHabitTarget);
  const isConfirmOpen = useStore((s) => s.isConfirmOpen);
  const setConfirmOpen = useStore((s) => s.setConfirmOpen);
  const modalOpen = useStore((s) => s.modalOpen);
  const setModalOpen = useStore((s) => s.setModalOpen);
  const detail = useStore((s) => s.detailTarget);
  const setDetail = useStore((s) => s.setDetailTarget);

  const [selectedHabit, setSelectedHabit] = useState("All habits");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wallpaperSync, setWallpaperSync] = useState(true);
  const [wallpaperState, setWallpaperState] = useState<WallpaperState>("idle");
  const [wallpaperSnapshot, setWallpaperSnapshot] = useState<number[][] | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>("q2");
  const [theme, setTheme] = useState<Theme>("dark");
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; onClick: () => void } } | null>(null);`;

content = content.replace(stateBlockMatch, newStateBlock);

// Remove deleted states scattered around
content = content.replace(/  const \[timeFilter, setTimeFilter\] = useState<"all" \| "morning" \| "afternoon" \| "evening">\("all"\);\n/g, '');
content = content.replace(/  const \[detail, setDetail\] = useState<{ q: Quadrant; i: number } \| null>\(null\);\n/g, '');
content = content.replace(/  const \[profileEditOpen, setProfileEditOpen\] = useState\(false\);\n/g, '');
content = content.replace(/  const \[editHabitTarget, setEditHabitTarget\] = useState<{ q: Quadrant; i: number } \| null>\(null\);\n/g, '');


// 3. Update toggleDone for Haptics
const toggleDoneMatch = `  const toggleDone = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    const wasDone = targetHabit.done;
    if (!wasDone) {
      try { navigator.vibrate?.([14, 40, 22]); } catch {}
    }
    await toggleHabitDone(targetHabit.id);
  };`;
const toggleDoneReplace = `  const toggleDone = async (q: Quadrant, i: number) => {
    const targetHabit = habits[q][i];
    if (!targetHabit) return;
    const wasDone = targetHabit.done;
    if (!wasDone) {
      try { 
        navigator.vibrate?.([14, 40, 22]); 
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    }
    await toggleHabitDone(targetHabit.id);
  };`;
content = content.replace(toggleDoneMatch, toggleDoneReplace);

// 4. Update Haptics in button liquid ripple
content = content.replace(/try { navigator.vibrate\?.\(18\); } catch {}/g, 'try { navigator.vibrate?.(18); Haptics.impact({ style: ImpactStyle.Light }); } catch {}');
content = content.replace(/try { navigator.vibrate\?.\(\[28, 60, 40\]\); } catch {}/g, 'try { navigator.vibrate?.([28, 60, 40]); Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}');

// 5. Replace Tabs (using regex to find the giant blocks)
// Find from {/* TAB 1: TODAY */} to the end of TAB 4
const tabStart = content.indexOf('{/* TAB 1: TODAY */}');
const tabEndMarker = '{/* TAB 4: WALLPAPER */}';
const tab4Start = content.indexOf(tabEndMarker);
// Let's find where TAB 4 ends. It ends at `            <div className="h-6" />`
const tabEnd = content.indexOf('<div className="h-6" />', tab4Start);

const newTabs = `
            {activeTab === "today" && (
              <TodayTab
                totalStreak={totalStreak}
                rate={rate}
                doneCount={doneCount}
                totalCount={totalCount}
                habits={habits}
                toggleDone={toggleDone}
                showToast={showToast}
              />
            )}
            {activeTab === "consistency" && (
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
              />
            )}
            {activeTab === "matrix" && (
              <MatrixTab
                totalCount={totalCount}
                habits={habits}
                toggleDone={toggleDone}
                restHabit={restHabit}
                togglePin={togglePin}
                deleteHabit={deleteHabit}
                moveHabit={moveHabit}
                adjustValue={adjustValue}
              />
            )}
            {activeTab === "wallpaper" && (
              <WallpaperTab
                wallpaperSync={wallpaperSync}
                syncPulse={syncPulse}
                wallpaperTheme={wallpaperTheme}
                setWallpaperTheme={setWallpaperTheme}
                displayedHeatmap={displayedHeatmap}
                totalStreak={totalStreak}
                rate={rate}
                wallpaperState={wallpaperState}
                toggleWallpaperSync={toggleWallpaperSync}
                previewWeeks={previewWeeks}
                setPreviewWeeks={setPreviewWeeks}
                showToast={showToast}
                setWallpaperPreview={setWallpaperPreview}
                applyWallpaper={applyWallpaper}
              />
            )}
            `;

content = content.substring(0, tabStart) + newTabs + content.substring(tabEnd);

// 6. Update Modals variables in JSX
content = content.replace(/profileEditOpen/g, 'isProfileOpen');
content = content.replace(/setProfileEditOpen/g, 'setProfileOpen');


// 7. Remove the inline component definitions at the bottom
// They are after function Grain ends.
const rowStart = content.indexOf('function Row({');
if (rowStart !== -1) {
    // Wait, some components might still be needed in index.tsx (like Row, Toggle, ConfirmDialog, Field, SheetShell).
    // The user ONLY asked to extract the Modals and Tabs. I've already extracted QuadrantCard, HabitRow, ProfileEditSheet, EditHabitSheet into the tab/modal files.
    // So I should delete QuadrantCard, HabitRow, ProfileEditSheet, EditHabitSheet from index.tsx.
    
    // Instead of regex, I'll use a hack to just remove them.
    // Let's find 'function QuadrantCard' and 'function HabitRow' and 'function ProfileEditSheet' and 'function EditHabitSheet'
    
    function removeComponent(code, compName) {
        const start = code.indexOf('function ' + compName + '(');
        if (start === -1) return code;
        
        let braceCount = 0;
        let inComp = false;
        let end = -1;
        
        for (let i = start; i < code.length; i++) {
            if (code[i] === '{') {
                inComp = true;
                braceCount++;
            } else if (code[i] === '}') {
                braceCount--;
                if (inComp && braceCount === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
        
        if (end !== -1) {
            return code.substring(0, start) + code.substring(end);
        }
        return code;
    }
    
    content = removeComponent(content, 'QuadrantCard');
    content = removeComponent(content, 'HabitRow');
    content = removeComponent(content, 'ProfileEditSheet');
    content = removeComponent(content, 'EditHabitSheet');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactor script completed successfully!');
