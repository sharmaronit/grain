const fs = require('fs');

let content = fs.readFileSync('src/routes/index.tsx', 'utf8');

// 1. Add import
if (!content.includes('import { ConsistencyTab } from "../components/tabs/ConsistencyTab";')) {
    const importSpot = 'import { useWallpaperSync } from "../hooks/useWallpaperSync";';
    content = content.replace(importSpot, importSpot + '\nimport { ConsistencyTab } from "../components/tabs/ConsistencyTab";');
}

// 2. Replace Tab 2
const startMarker = `{/* TAB 2: CONSISTENCY */}
            {activeTab === "consistency" && (`;
const endMarker = `{/* TAB 3: MATRIX */}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    
    const replacement = `{/* TAB 2: CONSISTENCY */}
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

            `;
            
    content = before + replacement + after;
    fs.writeFileSync('src/routes/index.tsx', content);
    console.log("Consistency tab replaced.");
} else {
    console.log("Could not find markers.");
}
