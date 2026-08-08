const fs = require('fs');

let content = fs.readFileSync('src/routes/index.tsx', 'utf8');

const targetStr = `{/* TAB 2: CONSISTENCY */}
            {activeTab === "consistency" && (
                </section>
              </div>
            )}`;

const replacementStr = `{/* TAB 2: CONSISTENCY */}
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
            )}`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('src/routes/index.tsx', content);
    console.log("Success! Replaced tab 2 contents.");
} else {
    // maybe \r\n issues? let's do a more robust replace
    const lines = content.split(/\r?\n/);
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('{/* TAB 2: CONSISTENCY */}')) {
            startIdx = i;
            break;
        }
    }
    
    if (startIdx !== -1) {
        // replace lines startIdx to startIdx + 4
        lines.splice(startIdx, 5, 
            '            {/* TAB 2: CONSISTENCY */}',
            '            {activeTab === "consistency" && (',
            '                <ConsistencyTab ',
            '                  heatmap={heatmap}',
            '                  selectedHabit={selectedHabit}',
            '                  setSelectedHabit={setSelectedHabit}',
            '                  doneCount={doneCount}',
            '                  totalCount={totalCount}',
            '                  totalStreak={totalStreak}',
            '                  rate={rate}',
            '                  weeklyInsights={weeklyInsights}',
            '                  showToast={showToast}',
            '                />',
            '            )}'
        );
        fs.writeFileSync('src/routes/index.tsx', lines.join('\n'));
        console.log("Success with line-based replace.");
    } else {
        console.log("Could not find start marker.");
    }
}
