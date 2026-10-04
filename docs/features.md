# 🚀 Grain — Feature Roadmap & Specifications (Podium Features)

This document contains the complete technical specifications, data structures, and implementation blueprints for the **5 Podium Features** designed to transform **Grain** into a winning application.

---

## 1. 📦 Starter Habit Template Packs (First Launch Onboarding)

### Goal
Eliminate the empty state when a new user signs up by providing curated 1-click habit template packs based on user goals.

### Data Model & Templates
```json
[
  {
    "id": "pack_mindfulness",
    "name": "Mindful Morning",
    "icon": "Sun",
    "description": "Start every day grounded, focused, and calm.",
    "habits": [
      {
        "name": "5 min Meditation",
        "category": "Mind",
        "quadrant": "q2",
        "time": "morning",
        "type": "binary",
        "frequency": "daily"
      },
      {
        "name": "Morning Gratitude Journal",
        "category": "Mind",
        "quadrant": "q2",
        "time": "morning",
        "type": "binary",
        "frequency": "daily"
      },
      {
        "name": "Hydrate 500ml Water",
        "category": "Health",
        "quadrant": "q1",
        "time": "morning",
        "type": "numeric",
        "target": 500,
        "unit": "ml",
        "frequency": "daily"
      }
    ]
  },
  {
    "id": "pack_deep_work",
    "name": "High Performance & Focus",
    "icon": "Zap",
    "description": "Structure your day around high-impact priorities.",
    "habits": [
      {
        "name": "90 min Deep Work Block",
        "category": "Focus",
        "quadrant": "q1",
        "time": "morning",
        "type": "numeric",
        "target": 90,
        "unit": "min",
        "frequency": "weekdays"
      },
      {
        "name": "Clear Eisenhower Inbox",
        "category": "Admin",
        "quadrant": "q3",
        "time": "afternoon",
        "type": "binary",
        "frequency": "daily"
      },
      {
        "name": "Read 20 pages",
        "category": "Growth",
        "quadrant": "q2",
        "time": "evening",
        "type": "numeric",
        "target": 20,
        "unit": "pages",
        "frequency": "daily"
      }
    ]
  },
  {
    "id": "pack_fitness",
    "name": "Daily Physical Vitality",
    "icon": "Flame",
    "description": "Build consistent physical stamina and rest discipline.",
    "habits": [
      {
        "name": "30 min Workout or Walk",
        "category": "Fitness",
        "quadrant": "q1",
        "time": "afternoon",
        "type": "numeric",
        "target": 30,
        "unit": "min",
        "frequency": "daily"
      },
      {
        "name": "No screens 1hr before sleep",
        "category": "Health",
        "quadrant": "q2",
        "time": "evening",
        "type": "binary",
        "frequency": "daily"
      }
    ]
  }
]
```

### UX Flow
During step 2 of onboarding (`OnboardingScreen`), offer a **"Choose your initial template pack"** grid. 1 tap populates the user's initial Firestore habits collection via batch writes (`writeBatch`).

---

## 2. 📊 Weekly Insights Engine

### Goal
Provide actionable analytics cards computed from the 364-day completions heatmap history.

### Analytics Algorithms

1. **Weekday vs. Weekend Consistency**:
   $$\text{Rate}_{\text{weekday}} = \frac{\text{Done}_{\text{Mon-Fri}}}{\text{Scheduled}_{\text{Mon-Fri}}} \times 100$$
   $$\text{Rate}_{\text{weekend}} = \frac{\text{Done}_{\text{Sat-Sun}}}{\text{Scheduled}_{\text{Sat-Sun}}} \times 100$$
   - *Sample Insight*: *"You're **23% more consistent** on weekdays than weekends."*

2. **Peak Completion Window**:
   - Compare morning, afternoon, and evening habit completion ratios.
   - *Sample Insight*: *"Your strongest window is **Morning** with an **88%** completion rate."*

3. **Top Performing Habit**:
   - Identify the habit with the longest active streak and highest completion rate over the last 30 days.

---

## 3. 🎖️ Milestone Badges & Celebration System

### Goal
Trigger milestone recognition modal + confetti particle animation when hitting key streak thresholds.

### Milestones Definition
```typescript
export interface MilestoneBadge {
  id: string;
  days: number;
  title: string;
  subtitle: string;
  iconName: string;
  unlockedAt?: string;
}

export const MILESTONES: MilestoneBadge[] = [
  { id: "m7", days: 7, title: "7-Day Ignition", subtitle: "First week completed!", iconName: "Flame" },
  { id: "m21", days: 21, title: "21-Day Habit Lock", subtitle: "Neuroplasticity in action.", iconName: "Zap" },
  { id: "m30", days: 30, title: "30-Day Master", subtitle: "A full month of discipline.", iconName: "Shield" },
  { id: "m100", days: 100, title: "100-Day Legend", subtitle: "Top 1% consistency.", iconName: "Sparkles" },
];
```

---

## 4. 🤖 AI Habit Coach (Gemini API Integration)

### Goal
Provide an AI Coach assistant modal inside the app using the `@google/genai` SDK or standard fetch endpoint to analyze completion patterns and generate actionable advice.

### System Prompt & Payload
```json
{
  "systemInstruction": "You are Grain AI Coach — a concise, encouraging, data-driven habit mentor. Analyze the user's habits, current streaks, completion rates, and daily notes to provide 3 bullet points of actionable advice.",
  "userContext": {
    "currentStreak": 14,
    "completionRate": 82,
    "habits": [
      { "name": "Meditate", "streak": 14, "quadrant": "Schedule" },
      { "name": "Deep Work", "streak": 2, "quadrant": "Do first" }
    ],
    "notes": "Felt tired in the evening, missed workout."
  }
}
```

---

## 5. 🌐 Social Accountability (Shareable Read-Only Page)

### Goal
Allow users to generate a public, read-only URL (`/share/:streakId`) showing their live heatmap, top streaks, and badge showcase.

### Shared Document Schema (`/public_streaks/{streakId}`)
```typescript
export interface PublicStreakDoc {
  streakId: string;
  userId: string;
  name: string;
  avatarInitials: string;
  tagline: string;
  totalStreak: number;
  completionRate: number;
  habitsSummary: Array<{ name: string; streak: number; category: string }>;
  heatmapSnapshot: number[][]; // 52x7 intensity grid
  updatedAt: any;
}
```

---

*Grain App Roadmap — Prepared for Production & Hackathon Podium Execution.*
