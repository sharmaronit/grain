package com.dailyclone.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Handler;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.util.Calendar;

public class GrainWallpaperService extends WallpaperService {

    // ── Prefs key for the saved custom photo path ───────────────────────
    static final String PREFS_NAME      = "CapacitorStorage";
    static final String KEY_LIVE_DATA   = "GRAIN_LIVE_DATA";
    static final String KEY_PHOTO_PATH  = "GRAIN_CUSTOM_PHOTO_PATH"; // file path, not base64

    private static final Paint PILL_BG_PAINT = new Paint(Paint.ANTI_ALIAS_FLAG);

    // ── WallpaperData ───────────────────────────────────────────────────

    public static class WallpaperData {
        public int[][] heatmap;
        public long   heatmapStartMs = 0;
        public String themeKey     = "amoled";
        public int    previewWeeks = 26;
        public int    currentStreak  = 0;
        public int    completionRate = 0;
        public float  offsetY        = 0.54f;   // fraction of screen height (0.0–1.0)
        public boolean isGoalActive  = false;
        public String  accentColor   = null;
        public String  gridStyle     = "weeks";  // "weeks" | "year" | "month"
        public float   photoOverlay  = 0.4f;
        public String  statsAlignment = "center"; // "left" | "center" | "right"
        public String  gridColorTheme = "emerald";
        public float   offsetX        = 0f;
        public float   gridScale      = 1f;
        public float   photoOffsetX   = 0f;
        public float   photoOffsetY   = 0f;
        public float   photoScale     = 1f;

        public static class GoalData {
            public String id;
            public String title;
            public int[] boxes;
            public int currentStreak;
            public int completionRate;
        }
        public GoalData[] stackedGoals = null;
        public String[] habitText = null;

        /** Parse from the GRAIN_LIVE_DATA JSON stored in SharedPreferences.
         *  NOTE: base64 photo data is intentionally NOT stored here —
         *        WallpaperPlugin saves the photo to disk and stores only the path. */
        public static WallpaperData fromJson(String jsonStr) {
            WallpaperData d = new WallpaperData();
            if (jsonStr == null) return d;
            try {
                JSONObject obj = new JSONObject(jsonStr);
                d.heatmapStartMs = obj.optLong("heatmapStartMs", 0L);
                d.themeKey     = obj.optString("theme", "amoled");
                d.previewWeeks = Math.max(12, Math.min(52, obj.optInt("previewWeeks", 26)));
                d.currentStreak  = obj.optInt("currentStreak", 0);
                d.completionRate = obj.optInt("completionRate", 0);
                // offsetY comes as a 0–100 value (percentage). Default 54 = centred.
                double raw = obj.optDouble("offsetY", 54.0);
                d.offsetY = (float) (raw / 100.0);
                if (d.offsetY < 0.05f || d.offsetY > 0.95f) d.offsetY = 0.54f;
                d.isGoalActive = obj.optBoolean("isGoalActive", false);
                d.accentColor  = obj.optString("accentColor", null);
                if (d.accentColor != null && d.accentColor.isEmpty()) d.accentColor = null;
                d.gridStyle    = obj.optString("gridStyle", "weeks");
                d.photoOverlay = (float) obj.optDouble("photoOverlay", 0.4);
                d.statsAlignment = obj.optString("statsAlignment", "center");
                d.gridColorTheme = obj.optString("gridColorTheme", "emerald");
                d.offsetX = (float) obj.optDouble("offsetX", 0.0);
                d.gridScale = (float) obj.optDouble("gridScale", 1.0);
                JSONObject wpo = obj.optJSONObject("wallpaperPhotoOffset");
                if (wpo != null) {
                    d.photoOffsetX = (float) wpo.optDouble("x", 0.0);
                    d.photoOffsetY = (float) wpo.optDouble("y", 0.0);
                } else {
                    d.photoOffsetX = (float) obj.optDouble("photoOffsetX", 0.0);
                    d.photoOffsetY = (float) obj.optDouble("photoOffsetY", 0.0);
                }
                d.photoScale   = (float) obj.optDouble("wallpaperPhotoScale", obj.optDouble("photoScale", 1.0));

                JSONArray arr = obj.optJSONArray("heatmap");
                if (arr != null) {
                    int cols = arr.length();
                    d.heatmap = new int[cols][7];
                    for (int i = 0; i < cols; i++) {
                        JSONArray col = arr.optJSONArray(i);
                        if (col != null)
                            for (int j = 0; j < Math.min(col.length(), 7); j++)
                                d.heatmap[i][j] = col.optInt(j, 0);
                    }
                }

                JSONArray goalsArr = obj.optJSONArray("stackedGoals");
                if (goalsArr != null && goalsArr.length() > 0) {
                    d.stackedGoals = new GoalData[goalsArr.length()];
                    for (int i = 0; i < goalsArr.length(); i++) {
                        JSONObject go = goalsArr.optJSONObject(i);
                        if (go != null) {
                            GoalData gd = new GoalData();
                            gd.id = go.optString("id");
                            gd.title = go.optString("title");
                            gd.currentStreak = go.optInt("currentStreak", 0);
                            gd.completionRate = go.optInt("completionRate", 0);
                            JSONArray gBoxes = go.optJSONArray("boxes");
                            if (gBoxes != null) {
                                gd.boxes = new int[gBoxes.length()];
                                for (int ci = 0; ci < gBoxes.length(); ci++) {
                                    gd.boxes[ci] = gBoxes.optInt(ci, 0);
                                }
                            }
                            d.stackedGoals[i] = gd;
                        }
                    }
                }

                JSONArray habitsArr = obj.optJSONArray("habitText");
                if (habitsArr != null && habitsArr.length() > 0) {
                    d.habitText = new String[habitsArr.length()];
                    for (int i = 0; i < habitsArr.length(); i++) {
                        d.habitText[i] = habitsArr.optString(i);
                    }
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
            return d;
        }

        /** Creates a copy of WallpaperData with heatmap columns shifted dynamically if weeks have passed. */
        public WallpaperData getDynamicAdjusted() {
            WallpaperData copy = new WallpaperData();
            copy.heatmapStartMs = this.heatmapStartMs;
            copy.themeKey = this.themeKey;
            copy.previewWeeks = this.previewWeeks;
            copy.currentStreak = this.currentStreak;
            copy.completionRate = this.completionRate;
            copy.offsetY = this.offsetY;
            copy.isGoalActive = this.isGoalActive;
            copy.accentColor = this.accentColor;
            copy.gridStyle = this.gridStyle;
            copy.photoOverlay = this.photoOverlay;
            copy.statsAlignment = this.statsAlignment;
            copy.gridColorTheme = this.gridColorTheme;
            copy.offsetX = this.offsetX;
            copy.gridScale = this.gridScale;
            copy.photoOffsetX = this.photoOffsetX;
            copy.photoOffsetY = this.photoOffsetY;
            copy.photoScale = this.photoScale;
            copy.stackedGoals = this.stackedGoals;
            copy.habitText = this.habitText;

            if (this.heatmap == null || this.heatmap.length == 0) {
                return copy;
            }

            int cols = this.heatmap.length;
            int[][] currentGrid = new int[cols][7];
            for (int c = 0; c < cols; c++) {
                System.arraycopy(this.heatmap[c], 0, currentGrid[c], 0, 7);
            }

            Calendar now = getMidnightCalendar();
            long nowMs = now.getTimeInMillis();
            int todayDow = (now.get(Calendar.DAY_OF_WEEK) + 5) % 7; // Mon=0 .. Sun=6
            long currentWeekMondayMs = nowMs - (todayDow * 86400000L);

            if (this.heatmapStartMs > 0) {
                long syncedWeekMondayMs = this.heatmapStartMs + (51L * 7L * 86400000L);
                long diffWeeks = (currentWeekMondayMs - syncedWeekMondayMs) / (7L * 86400000L);

                if (diffWeeks > 0) {
                    int shift = (int) Math.min(diffWeeks, cols);
                    int[][] shifted = new int[cols][7];
                    for (int c = 0; c < cols - shift; c++) {
                        System.arraycopy(currentGrid[c + shift], 0, shifted[c], 0, 7);
                    }
                    currentGrid = shifted;
                    copy.completionRate = 0; // New week starts with 0% completion
                } else if (diffWeeks == 0) {
                    // Check if today is a new day compared to when data was synced
                    // The last column is current week. If today's cell is unpopulated, today's rate resets.
                    long syncedDayMs = syncedWeekMondayMs;
                    // If current day has advanced past sync day
                    if (nowMs > syncedDayMs) {
                        // If today's habits haven't been completed yet, show 0% for today in stats
                        if (currentGrid[cols - 1][todayDow] == 0) {
                            copy.completionRate = 0;
                        }
                    }
                }
            }

            copy.heatmap = currentGrid;
            return copy;
        }
    }

    // ── Theme resolver ──────────────────────────────────────────────────

    private static void resolveTheme(String key, String gridKey,
                                     int[] bg, int[] fg, int[] accent, int[][] ints) {
        String t = (key == null) ? "amoled" : key;
        if ("auto".equals(t)) {
            int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
            t = (h >= 6 && h < 18) ? "mono" : "amoled";
        }
        if ("custom".equals(t)) t = "amoled"; // custom uses amoled palette for the grid

        switch (t) {
            case "mono":
                bg[0]     = Color.parseColor("#E9E9EA");
                fg[0]     = Color.parseColor("#111111");
                accent[0] = Color.parseColor("#059669");
                ints[0]   = new int[]{
                    Color.parseColor("#D4D4D8"), Color.parseColor("#A1A1AA"),
                    Color.parseColor("#059669"), Color.parseColor("#16A34A")};
                break;
            case "slate":
                bg[0]     = Color.parseColor("#1F2937");
                fg[0]     = Color.parseColor("#E5E7EB");
                accent[0] = Color.parseColor("#38BDF8");
                ints[0]   = new int[]{
                    Color.parseColor("#334155"), Color.parseColor("#475569"),
                    Color.parseColor("#38BDF8"), Color.parseColor("#7DD3FC")};
                break;
            case "neon":
                bg[0]     = Color.parseColor("#11052C");
                fg[0]     = Color.parseColor("#FFFFFF");
                accent[0] = Color.parseColor("#F472B6");
                ints[0]   = new int[]{
                    Color.argb(40, 255, 255, 255), Color.argb(90, 255, 255, 255),
                    Color.parseColor("#F472B6"), Color.parseColor("#22D3EE")};
                break;
            default: // amoled
                bg[0]     = Color.parseColor("#000000");
                fg[0]     = Color.parseColor("#FFFFFF");
                accent[0] = Color.parseColor("#22C55E");
                ints[0]   = new int[]{
                    Color.parseColor("#2A2A2A"), Color.parseColor("#3F3F46"),
                    Color.parseColor("#166534"), Color.parseColor("#22C55E")};
                break;
        }

        // Apply gridColorTheme overrides for mid, hi, and accent
        if (gridKey != null) {
            switch (gridKey) {
                case "crimson":
                    accent[0] = Color.parseColor("#dc2626");
                    ints[0][0] = Color.argb(38, 220, 38, 38);
                    ints[0][1] = Color.argb(102, 220, 38, 38);
                    ints[0][2] = Color.parseColor("#991b1b");
                    ints[0][3] = Color.parseColor("#dc2626");
                    break;
                case "amber":
                    accent[0] = Color.parseColor("#f59e0b");
                    ints[0][0] = Color.argb(38, 245, 158, 11);
                    ints[0][1] = Color.argb(102, 245, 158, 11);
                    ints[0][2] = Color.parseColor("#b45309");
                    ints[0][3] = Color.parseColor("#f59e0b");
                    break;
                case "neutral":
                    accent[0] = Color.parseColor("#737373");
                    ints[0][0] = Color.argb(38, 115, 115, 115);
                    ints[0][1] = Color.argb(102, 115, 115, 115);
                    ints[0][2] = Color.parseColor("#525252");
                    ints[0][3] = Color.parseColor("#737373");
                    break;
                case "ink":
                    accent[0] = Color.parseColor("#a3a3a3");
                    ints[0][0] = Color.argb(38, 163, 163, 163);
                    ints[0][1] = Color.argb(102, 163, 163, 163);
                    ints[0][2] = Color.parseColor("#525252");
                    ints[0][3] = Color.parseColor("#a3a3a3");
                    break;
                case "emerald":
                default:
                    accent[0] = Color.parseColor("#22c55e");
                    ints[0][0] = Color.argb(38, 34, 197, 94);
                    ints[0][1] = Color.argb(102, 34, 197, 94);
                    ints[0][2] = Color.parseColor("#166534");
                    ints[0][3] = Color.parseColor("#22c55e");
                    break;
            }
        }
    }

    // ── Main render entry point ─────────────────────────────────────────

    /** Called by both the live engine and WallpaperPlugin static fallback. */
    public static void drawHeatmapToCanvas(Context ctx, Canvas canvas,
                                           int width, int height,
                                           WallpaperData data) {
        if (data == null) data = new WallpaperData();
        WallpaperData adjusted = data.getDynamicAdjusted();

        int[] bg = {0}, fg = {0}, accent = {0};
        int[][] ints = {null};
        resolveTheme(adjusted.themeKey, adjusted.gridColorTheme, bg, fg, accent, ints);

        float density = ctx.getResources().getDisplayMetrics().density;
        Paint paint     = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

        // ── Background ──────────────────────────────────────────────────

        boolean drewPhoto = false;
        if ("custom".equals(adjusted.themeKey)) {
            // Load saved photo safely with downsampling to prevent OutOfMemory crashes
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String photoPath = prefs.getString(KEY_PHOTO_PATH, null);
            if (photoPath != null) {
                try {
                    Bitmap photo = decodeSampledBitmapFromFile(photoPath, width, height);
                    if (photo != null) {
                        // Center-crop to fill
                        float scaleX = (float) width  / photo.getWidth();
                        float scaleY = (float) height / photo.getHeight();
                        float baseScale  = Math.max(scaleX, scaleY);
                        float scale = baseScale * adjusted.photoScale;
                        int drawW    = Math.round(photo.getWidth()  * scale);
                        int drawH    = Math.round(photo.getHeight() * scale);
                        int offX     = (width  - drawW) / 2 + Math.round(adjusted.photoOffsetX * density);
                        int offY     = (height - drawH) / 2 + Math.round(adjusted.photoOffsetY * density);
                        canvas.drawBitmap(photo,
                            new android.graphics.Rect(0, 0, photo.getWidth(), photo.getHeight()),
                            new android.graphics.Rect(offX, offY, offX + drawW, offY + drawH),
                            null);
                        photo.recycle();
                        // Overlay dimmer
                        int alpha = Math.round(adjusted.photoOverlay * 255f);
                        canvas.drawARGB(alpha, 0, 0, 0);
                        drewPhoto = true;
                    }
                } catch (Throwable t) {
                    t.printStackTrace();
                }
            }
            if (!drewPhoto) canvas.drawColor(Color.BLACK);
        } else if ("neon".equals(adjusted.themeKey)) {
            LinearGradient shader = new LinearGradient(0, 0, width, height,
                new int[]{Color.parseColor("#EC4899"), Color.parseColor("#8B5CF6"),
                           Color.parseColor("#06B6D4")},
                null, Shader.TileMode.CLAMP);
            paint.setShader(shader);
            canvas.drawRect(0, 0, width, height, paint);
            paint.setShader(null);
        } else {
            canvas.drawColor(bg[0]);
        }

        // ── No data state ───────────────────────────────────────────────
        if (adjusted.heatmap == null || adjusted.heatmap.length == 0) {
            textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            textPaint.setTextSize(14f * density);
            textPaint.setColor(fg[0]);
            textPaint.setTextAlign(Paint.Align.CENTER);
            textPaint.setAlpha(120);
            canvas.drawText("Open Grain to sync your habits",
                            width / 2f, height * 0.55f, textPaint);
            return;
        }

        // ── Dispatch to grid renderer ───────────────────────────────────
        if ("year".equals(adjusted.gridStyle)) {
            drawYearGrid(canvas, width, height, adjusted, paint, textPaint, fg, accent, ints, density);
        } else if ("month".equals(adjusted.gridStyle)) {
            drawMonthGrid(canvas, width, height, adjusted, paint, textPaint, fg, accent, ints, density);
        } else if ("goals".equals(adjusted.gridStyle)) {
            drawStackedGoals(canvas, width, height, adjusted, paint, textPaint, fg, accent, ints, density);
        } else if ("widget".equals(adjusted.gridStyle)) {
            drawWidgetCard(canvas, width, height, adjusted, paint, textPaint, fg, accent, ints, density);
        } else {
            drawWeeksGrid(canvas, width, height, adjusted, paint, textPaint, fg, accent, ints, density);
        }
    }

    private static Calendar getMidnightCalendar() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c;
    }

    // ── Weeks grid (Portrait 7-Day Calendar Layout) ──────────────────────

    private static void drawWeeksGrid(Canvas canvas, int w, int h, WallpaperData data,
                                      Paint paint, Paint tp,
                                      int[] fg, int[] accent, int[][] ints, float dp) {
        int previewWeeks = Math.max(1, data.previewWeeks);
        int cols = 7;
        int rows = previewWeeks;

        float baseCellSize = previewWeeks > 32 ? 10f : (previewWeeks > 20 ? 14f : (previewWeeks > 12 ? 18f : 24f));
        float sq = baseCellSize * dp * data.gridScale;
        float gap = 4f * dp * data.gridScale;
        float cr = (sq > 16f * dp ? 5f : 3f) * dp;
        float monthColW = 28f * dp * data.gridScale;
        float headerH = 18f * dp * data.gridScale;

        float gridW = monthColW + cols * sq + (cols - 1) * gap;
        float gridH = headerH + rows * sq + (rows - 1) * gap;

        float startX = (w - gridW) / 2f + (data.offsetX * dp);
        float startY = h * data.offsetY - gridH / 2f;

        // Draw day headers: M T W T F S S
        String[] dayLabels = {"M", "T", "W", "T", "F", "S", "S"};
        tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        tp.setTextSize(10f * dp * data.gridScale);
        tp.setColor(fg[0]);
        tp.setAlpha(100);
        tp.setTextAlign(Paint.Align.CENTER);

        float cellsStartX = startX + monthColW;
        for (int c = 0; c < 7; c++) {
            float cx = cellsStartX + c * (sq + gap) + sq / 2f;
            canvas.drawText(dayLabels[c], cx, startY + 12f * dp * data.gridScale, tp);
        }
        tp.setAlpha(255);

        Calendar todayCal = getMidnightCalendar();
        int todayDow = (todayCal.get(Calendar.DAY_OF_WEEK) + 5) % 7; // Mon=0 .. Sun=6
        long mondayThisWeekMs = todayCal.getTimeInMillis() - (todayDow * 86400000L);
        long heatmapStartMs = data.heatmapStartMs > 0 ? data.heatmapStartMs : (mondayThisWeekMs - (51L * 7L * 86400000L));

        int heatmapLen = data.heatmap != null ? data.heatmap.length : 0;
        int startCol = Math.max(0, heatmapLen - previewWeeks);
        int todayColIdx = previewWeeks - 1;

        String[] monthNames = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        int lastMonth = -1;

        float rowsStartY = startY + headerH;

        for (int r = 0; r < rows; r++) {
            int colIdx = startCol + r;
            long weekStartMs = heatmapStartMs + (colIdx * 7L * 86400000L);
            Calendar weekCal = getMidnightCalendar();
            weekCal.setTimeInMillis(weekStartMs);
            int month = weekCal.get(Calendar.MONTH);

            float rowY = rowsStartY + r * (sq + gap);

            // Draw month label on the left if month changed
            if (r == 0 || month != lastMonth) {
                lastMonth = month;
                tp.setTextSize(9f * dp * data.gridScale);
                tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
                tp.setTextAlign(Paint.Align.RIGHT);
                tp.setColor(fg[0]);
                tp.setAlpha(150);
                canvas.drawText(monthNames[month].toUpperCase(), startX + monthColW - 6f * dp, rowY + sq * 0.75f, tp);
                tp.setAlpha(255);
            }

            // Draw 7 day squares in this week row
            for (int c = 0; c < 7; c++) {
                float x = cellsStartX + c * (sq + gap);
                float y = rowY;

                boolean isToday = (r == todayColIdx) && (c == todayDow);
                boolean isFuture = (r == todayColIdx) && (c > todayDow);

                int level = 0;
                if (!isFuture && data.heatmap != null && colIdx >= 0 && colIdx < data.heatmap.length) {
                    level = clamp(data.heatmap[colIdx][c]);
                }

                paint.setColor(isFuture ? Color.argb(20, 255, 255, 255) : ints[0][level]);
                if (level >= 2 && !isFuture) {
                    paint.setShadowLayer(6f * dp, 0, 0, ints[0][level]);
                } else {
                    paint.clearShadowLayer();
                }

                RectF rect = new RectF(x, y, x + sq, y + sq);
                canvas.drawRoundRect(rect, cr, cr, paint);

                if (isToday) {
                    paint.clearShadowLayer();
                    paint.setStyle(Paint.Style.STROKE);
                    paint.setStrokeWidth(2f * dp);
                    paint.setColor(accent[0]);

                    float inset = 1f * dp;
                    RectF innerRect = new RectF(x + inset, y + inset, x + sq - inset, y + sq - inset);
                    float innerCr = Math.max(0, cr - inset);
                    canvas.drawRoundRect(innerRect, innerCr, innerCr, paint);
                    paint.setStyle(Paint.Style.FILL);
                }
            }
        }

        paint.clearShadowLayer();
        drawStatsPill(canvas, cellsStartX, cellsStartX + cols * sq + (cols - 1) * gap, rowsStartY + rows * sq + (rows - 1) * gap + 24f * dp, data, tp, fg, dp);
    }

    // ── Frosted Liquid-Glass Widget Card ────────────────────────────────

    private static void drawWidgetCard(Canvas canvas, int w, int h, WallpaperData data,
                                       Paint paint, Paint tp,
                                       int[] fg, int[] accent, int[][] ints, float dp) {
        int previewWeeks = Math.min(Math.max(1, data.previewWeeks), 12);
        int cols = 7;
        int rows = previewWeeks;

        float sq = 14f * dp * data.gridScale;
        float gap = 3f * dp * data.gridScale;
        float cr = 3f * dp;

        float gridInnerW = cols * sq + (cols - 1) * gap;
        float headerLabelsH = 14f * dp;
        float gridH = headerLabelsH + rows * sq + (rows - 1) * gap;

        float cardPadH = 20f * dp;
        float cardPadV = 18f * dp;
        float headerStatsH = 24f * dp;
        float footerH = 22f * dp;
        float dividerPad = 12f * dp;

        float cardW = Math.max(gridInnerW + cardPadH * 2, w * 0.82f);
        float cardH = cardPadV * 2 + headerStatsH + dividerPad + gridH + dividerPad + footerH;

        float startX = (w - cardW) / 2f + (data.offsetX * dp);
        float startY = h * data.offsetY - cardH / 2f;

        // 1. Draw Frosted Card Background
        paint.clearShadowLayer();
        paint.setStyle(Paint.Style.FILL);
        paint.setColor("mono".equals(data.themeKey)
            ? Color.argb(50, 0, 0, 0)
            : Color.argb(110, 10, 10, 15));
        RectF cardRect = new RectF(startX, startY, startX + cardW, startY + cardH);
        float cardRadius = 24f * dp;
        canvas.drawRoundRect(cardRect, cardRadius, cardRadius, paint);

        // 2. Draw Card Border
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(1.2f * dp);
        paint.setColor(Color.argb(45, 255, 255, 255));
        canvas.drawRoundRect(cardRect, cardRadius, cardRadius, paint);
        paint.setStyle(Paint.Style.FILL);

        float currentY = startY + cardPadV;

        // 3. Stats Header
        tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        tp.setTextSize(13f * dp);
        tp.setColor(fg[0]);
        tp.setTextAlign(Paint.Align.LEFT);
        canvas.drawText("🔥 " + data.currentStreak + "d Streak", startX + cardPadH, currentY + 14f * dp, tp);

        tp.setTextAlign(Paint.Align.RIGHT);
        tp.setColor(accent[0]);
        tp.setTextSize(12f * dp);
        canvas.drawText(data.completionRate + "% Done", startX + cardW - cardPadH, currentY + 14f * dp, tp);

        currentY += headerStatsH;

        // Divider
        paint.setColor(Color.argb(25, 255, 255, 255));
        paint.setStrokeWidth(1f * dp);
        canvas.drawLine(startX + cardPadH, currentY + dividerPad / 2f, startX + cardW - cardPadH, currentY + dividerPad / 2f, paint);

        currentY += dividerPad;

        // 4. Day Headers: M T W T F S S
        float gridStartX = startX + (cardW - gridInnerW) / 2f;
        String[] dayLabels = {"M", "T", "W", "T", "F", "S", "S"};
        tp.setTextSize(9f * dp);
        tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        tp.setColor(fg[0]);
        tp.setAlpha(100);
        tp.setTextAlign(Paint.Align.CENTER);
        for (int c = 0; c < 7; c++) {
            float cx = gridStartX + c * (sq + gap) + sq / 2f;
            canvas.drawText(dayLabels[c], cx, currentY + 9f * dp, tp);
        }
        tp.setAlpha(255);

        currentY += headerLabelsH;

        // 5. Heatmap Grid
        Calendar todayCal = getMidnightCalendar();
        int todayDow = (todayCal.get(Calendar.DAY_OF_WEEK) + 5) % 7; // Mon=0 .. Sun=6
        int heatmapLen = data.heatmap != null ? data.heatmap.length : 0;
        int startCol = Math.max(0, heatmapLen - previewWeeks);
        int todayColIdx = previewWeeks - 1;

        for (int r = 0; r < rows; r++) {
            int colIdx = startCol + r;
            float rowY = currentY + r * (sq + gap);

            for (int c = 0; c < 7; c++) {
                float x = gridStartX + c * (sq + gap);
                float y = rowY;

                boolean isToday = (r == todayColIdx) && (c == todayDow);
                boolean isFuture = (r == todayColIdx) && (c > todayDow);

                int level = 0;
                if (!isFuture && data.heatmap != null && colIdx >= 0 && colIdx < data.heatmap.length) {
                    level = clamp(data.heatmap[colIdx][c]);
                }

                paint.setStyle(Paint.Style.FILL);
                paint.setColor(isFuture ? Color.argb(15, 255, 255, 255) : ints[0][level]);
                if (level >= 2 && !isFuture) {
                    paint.setShadowLayer(5f * dp, 0, 0, ints[0][level]);
                } else {
                    paint.clearShadowLayer();
                }

                RectF rect = new RectF(x, y, x + sq, y + sq);
                canvas.drawRoundRect(rect, cr, cr, paint);

                if (isToday) {
                    paint.clearShadowLayer();
                    paint.setStyle(Paint.Style.STROKE);
                    paint.setStrokeWidth(1.5f * dp);
                    paint.setColor(accent[0]);
                    float inset = 1f * dp;
                    RectF innerRect = new RectF(x + inset, y + inset, x + sq - inset, y + sq - inset);
                    canvas.drawRoundRect(innerRect, Math.max(0, cr - inset), Math.max(0, cr - inset), paint);
                    paint.setStyle(Paint.Style.FILL);
                }
            }
        }
        paint.clearShadowLayer();

        currentY += rows * sq + (rows - 1) * gap;

        // Divider
        paint.setColor(Color.argb(25, 255, 255, 255));
        paint.setStrokeWidth(1f * dp);
        canvas.drawLine(startX + cardPadH, currentY + dividerPad / 2f, startX + cardW - cardPadH, currentY + dividerPad / 2f, paint);

        currentY += dividerPad;

        // 6. Habit Names Footer
        String habitStr = "FOCUS  ·  CONSISTENCY  ·  GROWTH";
        if (data.habitText != null && data.habitText.length > 0) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < data.habitText.length; i++) {
                if (i > 0) sb.append("  ·  ");
                sb.append(data.habitText[i].toUpperCase());
            }
            habitStr = sb.toString();
        }

        tp.setTextSize(9.5f * dp);
        tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        tp.setColor(fg[0]);
        tp.setAlpha(170);
        tp.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(habitStr, startX + cardW / 2f, currentY + 12f * dp, tp);
        tp.setAlpha(255);
    }

    // ── Stacked Goals grid ──────────────────────────────────────────────

    private static void drawStackedGoals(Canvas canvas, int w, int h, WallpaperData data,
                                         Paint paint, Paint tp,
                                         int[] fg, int[] accent, int[][] ints, float dp) {
        if (data.stackedGoals == null || data.stackedGoals.length == 0) {
            tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            tp.setTextSize(14f * dp);
            tp.setColor(fg[0]);
            tp.setTextAlign(Paint.Align.CENTER);
            tp.setAlpha(120);
            canvas.drawText("No active goals", w / 2f, h * 0.55f, tp);
            return;
        }

        float sq = 8f * dp * data.gridScale;
        float gap = 4f * dp * data.gridScale;
        float padding = 24f * dp;
        float maxAvail = w - padding * 2;
        int maxCols = 26; // approx 320dp max width limit
        int cols = (int) Math.min(maxCols, (maxAvail + gap) / (sq + gap));
        
        // Stats spacing
        float titleH = 14f * dp;
        float pillH = 14f * dp + 14f * dp; 
        float blockSpacing = 48f * dp;
        
        float totalLayoutH = 0;
        float[] blockHeights = new float[data.stackedGoals.length];
        
        for (int i = 0; i < data.stackedGoals.length; i++) {
            WallpaperData.GoalData goal = data.stackedGoals[i];
            int boxCount = goal.boxes != null ? goal.boxes.length : 0;
            int rows = (int) Math.ceil((float) boxCount / cols);
            float gridH = rows * sq + Math.max(0, rows - 1) * gap;
            float totalBlockH = gridH + 16f * dp + titleH + 8f * dp + pillH;
            blockHeights[i] = totalBlockH;
            totalLayoutH += totalBlockH;
        }
        totalLayoutH += (data.stackedGoals.length - 1) * blockSpacing;
        
        float currentY = h * data.offsetY - totalLayoutH / 2f;

        for (int gIdx = 0; gIdx < data.stackedGoals.length; gIdx++) {
            WallpaperData.GoalData goal = data.stackedGoals[gIdx];
            int boxCount = goal.boxes != null ? goal.boxes.length : 0;
            int rows = (int) Math.ceil((float) boxCount / cols);
            float gridH = rows * sq + Math.max(0, rows - 1) * gap;
            
            float blockStartY = currentY;
            
            float actualCols = Math.min(boxCount, cols);
            float gridW = actualCols * sq + Math.max(0, actualCols - 1) * gap;
            float startX = (w - gridW) / 2f + (data.offsetX * dp);

            // Draw Boxes
            for (int i = 0; i < boxCount; i++) {
                int r = i / cols;
                int c = i % cols;
                
                // If it's the last row, center the remaining boxes
                float rowStartX = startX;
                if (r == rows - 1) {
                    int remainingBoxes = boxCount - (r * cols);
                    float rowW = remainingBoxes * sq + Math.max(0, remainingBoxes - 1) * gap;
                    rowStartX = (w - rowW) / 2f;
                }
                
                float x = rowStartX + c * (sq + gap);
                float y = blockStartY + r * (sq + gap);
                int level = clamp(goal.boxes[i]);

                if (level == 1) {
                    paint.setColor(Color.argb(100, 150, 150, 150));
                    paint.clearShadowLayer();
                } else {
                    paint.setColor(level == 0 ? Color.argb(20, 255, 255, 255) : ints[0][level]);
                    if (level >= 2) paint.setShadowLayer(6f * dp, 0, 0, ints[0][level]);
                    else            paint.clearShadowLayer();
                }

                RectF rect = new RectF(x, y, x + sq, y + sq);
                float cr = 2f * dp;
                canvas.drawRoundRect(rect, cr, cr, paint);
            }
            paint.clearShadowLayer();
            
            // Draw Title and Stats
            float textY = blockStartY + gridH + 24f * dp;
            
            tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            tp.setTextSize(12f * dp);
            tp.setColor(fg[0]);
            tp.setAlpha(200);
            tp.setTextAlign(Paint.Align.CENTER);
            canvas.drawText(goal.title.toUpperCase(), w / 2f, textY, tp);
            
            tp.setColor(fg[0]);
            tp.setAlpha(153);
            tp.setTextSize(11f * dp);
            String statsText = goal.currentStreak + "d left - " + goal.completionRate + "%";
            canvas.drawText(statsText, w / 2f, textY + 16f * dp, tp);
            
            currentY += blockHeights[gIdx] + blockSpacing;
        }
    }

    // ── Year grid ───────────────────────────────────────────────────────

    private static void drawYearGrid(Canvas canvas, int w, int h, WallpaperData data,
                                     Paint paint, Paint tp,
                                     int[] fg, int[] accent, int[][] ints, float dp) {
        Calendar todayCal = getMidnightCalendar();
        int currentYear = todayCal.get(Calendar.YEAR);
        
        float sq = 8f * dp * data.gridScale; // match 8px square in web app
        float gap = 3f * dp * data.gridScale; // match 3px gap in web app
        float monthGapX = 24f * dp * data.gridScale; // match gap-x-6 (24px)
        float monthGapY = 28f * dp * data.gridScale; // match gap-y-7 (28px)
        
        int cols = 3;
        int rows = 4;
        
        float monthW = 7 * sq + 6 * gap;
        float monthH = 6 * sq + 5 * gap + 15f * dp; // 6 rows max + text header
        
        float gridW = cols * monthW + (cols - 1) * monthGapX;
        float gridH = rows * monthH + (rows - 1) * monthGapY;
        
        float startX = (w - gridW) / 2f + (data.offsetX * dp);
        float startY = h * data.offsetY - gridH / 2f;
        
        // Heatmap covers exactly 52 weeks (364 days) starting on Monday 51 weeks ago
        int todayDow = (todayCal.get(Calendar.DAY_OF_WEEK) + 5) % 7; // Mon=0
        long todayMs = todayCal.getTimeInMillis();
        long mondayThisWeekMs = todayMs - (todayDow * 86400000L);
        long heatmapStartMs = data.heatmapStartMs > 0 ? data.heatmapStartMs : (mondayThisWeekMs - (51L * 7L * 86400000L));
        
        for (int m = 0; m < 12; m++) {
            int col = m % 3;
            int row = m / 3;
            float mx = startX + col * (monthW + monthGapX);
            float my = startY + row * (monthH + monthGapY);
            
            Calendar firstDay = Calendar.getInstance();
            firstDay.set(currentYear, m, 1);
            int daysInMonth = firstDay.getActualMaximum(Calendar.DAY_OF_MONTH);
            int firstDow = (firstDay.get(Calendar.DAY_OF_WEEK) + 5) % 7; // Mon=0
            
            // Draw month name
            tp.setTextSize(9f * dp);
            tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
            tp.setTextAlign(Paint.Align.LEFT);
            tp.setColor(fg[0]);
            tp.setAlpha(140);
            
            String[] monthNames = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            canvas.drawText(monthNames[m], mx, my + 8f * dp, tp);
            tp.setAlpha(255);
            
            float gridTop = my + 15f * dp;
            
            for (int d = 1; d <= daysInMonth; d++) {
                int cell = firstDow + (d - 1);
                int r = cell / 7;
                int c = cell % 7;
                float cx = mx + c * (sq + gap);
                float cy = gridTop + r * (sq + gap);
                
                Calendar dCal = getMidnightCalendar();
                dCal.set(currentYear, m, d);
                
                boolean isToday = dCal.get(Calendar.YEAR) == todayCal.get(Calendar.YEAR) && 
                                  dCal.get(Calendar.MONTH) == todayCal.get(Calendar.MONTH) && 
                                  dCal.get(Calendar.DAY_OF_MONTH) == todayCal.get(Calendar.DAY_OF_MONTH);
                boolean isFuture = dCal.after(todayCal) && !isToday;
                
                int level = 0;
                if (!isFuture) {
                    long diffMs = dCal.getTimeInMillis() - heatmapStartMs;
                    int diffDays = (int) Math.round((double) diffMs / 86400000.0);
                    if (diffDays >= 0 && diffDays < 52 * 7) {
                        int hCol = diffDays / 7;
                        int hRow = diffDays % 7;
                        if (data.heatmap != null && hCol >= 0 && hCol < data.heatmap.length) {
                            level = clamp(data.heatmap[hCol][hRow]);
                        }
                    }
                }
                
                paint.setColor(isFuture ? Color.argb(10, 255, 255, 255) : ints[0][level]);
                paint.clearShadowLayer();
                
                RectF rcf = new RectF(cx, cy, cx + sq, cy + sq);
                canvas.drawRoundRect(rcf, 2f * dp, 2f * dp, paint);
                
                if (isToday) {
                    paint.setStyle(Paint.Style.STROKE);
                    paint.setStrokeWidth(1f * dp);
                    paint.setColor(accent[0]);
                    paint.setShadowLayer(6f * dp, 0, 0, (accent[0] & 0x00FFFFFF) | 0x40000000);
                    canvas.drawRoundRect(rcf, 2f * dp, 2f * dp, paint);
                    paint.clearShadowLayer();
                    paint.setStyle(Paint.Style.FILL);
                }
            }
        }
        
        drawStatsPill(canvas, startX, startX + gridW, startY + gridH + 16f * dp, data, tp, fg, dp);
    }

    // ── Month calendar grid ─────────────────────────────────────────────

    private static void drawMonthGrid(Canvas canvas, int w, int h, WallpaperData data,
                                      Paint paint, Paint tp,
                                      int[] fg, int[] accent, int[][] ints, float dp) {
        Calendar cal     = getMidnightCalendar();
        int year         = cal.get(Calendar.YEAR);
        int month        = cal.get(Calendar.MONTH);
        int todayDate    = cal.get(Calendar.DAY_OF_MONTH);
        int daysInMonth  = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
        String monthName = cal.getDisplayName(Calendar.MONTH, Calendar.LONG, java.util.Locale.getDefault()).toUpperCase();

        Calendar first = Calendar.getInstance();
        first.set(year, month, 1);
        int startOffset = (first.get(Calendar.DAY_OF_WEEK) + 5) % 7; // Mon=0

        int totalCells  = startOffset + daysInMonth;
        int numRows     = (int) Math.ceil(totalCells / 7.0);

        float padding   = 24f * dp;
        float gap       = 2f * dp * data.gridScale;
        float avail     = w - padding * 2;
        float sq        = ((avail - 6 * gap) / 7f) * data.gridScale; // Cell size
        
        float monthNameH = 32f * dp;
        float headerH    = 24f * dp;
        float gridH      = numRows * sq + (numRows - 1) * gap;
        float totalH     = monthNameH + headerH + gridH;
        
        float startX    = padding + (data.offsetX * dp);
        float startY    = h * data.offsetY - totalH / 2f;

        // Month name
        tp.setTextSize(13f * dp);
        tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        tp.setTextAlign(Paint.Align.CENTER);
        tp.setColor(fg[0]);
        tp.setAlpha(178); // ~0.7 opacity
        tp.setLetterSpacing(0.25f);
        canvas.drawText(monthName, w / 2f, startY + monthNameH * 0.6f, tp);
        tp.setLetterSpacing(0f); // reset
        
        float currentY = startY + monthNameH;

        // Day headers
        String[] labels = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"};
        tp.setTextSize(10f * dp);
        tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        tp.setTextAlign(Paint.Align.CENTER);
        tp.setColor(fg[0]);
        tp.setAlpha(102); // ~0.4 opacity
        tp.setLetterSpacing(0.05f);
        for (int d = 0; d < 7; d++) {
            canvas.drawText(labels[d], startX + d * (sq + gap) + sq / 2f, currentY + headerH * 0.6f, tp);
        }
        tp.setLetterSpacing(0f); // reset
        tp.setAlpha(255);
        
        currentY += headerH;

        int todayDow = (cal.get(Calendar.DAY_OF_WEEK) + 5) % 7;
        long mondayThisWeekMs = cal.getTimeInMillis() - (todayDow * 86400000L);
        long heatmapStartMs = data.heatmapStartMs > 0 ? data.heatmapStartMs : (mondayThisWeekMs - (51L * 7L * 86400000L));

        for (int cell = 0; cell < totalCells; cell++) {
            if (cell < startOffset) continue;
            int dayNum   = cell - startOffset + 1;
            int col      = cell % 7;
            int row      = cell / 7;
            float x      = startX + col * (sq + gap);
            float y      = currentY + row * (sq + gap);
            boolean isTd = dayNum == todayDate;
            boolean isFu = dayNum > todayDate;

            // Direct date-offset lookup into 52-week heatmap
            Calendar dc = getMidnightCalendar();
            dc.set(year, month, dayNum);
            long diffMs = dc.getTimeInMillis() - heatmapStartMs;
            int diffDays = (int) Math.round((double) diffMs / 86400000.0);
            int hColIdx = diffDays / 7;
            int hRowIdx = diffDays % 7;

            int level = 0;
            if (!isFu && data.heatmap != null && hColIdx >= 0 && hColIdx < data.heatmap.length && hRowIdx >= 0 && hRowIdx < 7) {
                level = clamp(data.heatmap[hColIdx][hRowIdx]);
            }

            RectF r = new RectF(x, y, x + sq, y + sq);
            
            // Today ring
            if (isTd) {
                paint.setStyle(Paint.Style.STROKE);
                paint.setStrokeWidth(1.5f * dp);
                paint.setColor(accent[0]);
                paint.setAlpha(230); // ~0.9 opacity
                paint.clearShadowLayer();
                canvas.drawCircle(r.centerX(), r.centerY(), (sq / 2f) - 3f * dp, paint);
                paint.setStyle(Paint.Style.FILL);
            }
            
            // Day number
            tp.setTextSize(15f * dp);
            tp.setTypeface(Typeface.create(Typeface.DEFAULT, isTd ? Typeface.BOLD : Typeface.NORMAL));
            tp.setTextAlign(Paint.Align.CENTER);
            tp.setColor(fg[0]);
            tp.setAlpha(isFu ? 64 : (isTd ? 255 : 216)); // future=0.25, today=1, past=0.85
            
            Paint.FontMetrics fm = tp.getFontMetrics();
            float textY = r.centerY() - (fm.descent + fm.ascent) / 2f;
            // Move text up slightly if we need to draw a dot under it, to make it look centered
            if (!isFu) textY -= 2f * dp; 
            canvas.drawText(String.valueOf(dayNum), r.centerX(), textY, tp);

            // Completion dot
            if (!isFu && level > 0) {
                paint.setStyle(Paint.Style.FILL);
                paint.setColor(ints[0][level]);
                paint.clearShadowLayer();
                canvas.drawCircle(r.centerX(), r.centerY() + 8f * dp, 2f * dp, paint);
            }
        }
        float gridW = 7 * sq + 6 * gap;
        drawStatsPill(canvas, startX, startX + gridW, currentY + gridH + 16f * dp, data, tp, fg, dp);
    }

    // ── Stats pill ──────────────────────────────────────────────────────

    private static void drawStatsPill(Canvas canvas, float gridLeft, float gridRight, float pillTopY,
                                      WallpaperData data, Paint tp, int[] fg, float dp) {
        String text = data.isGoalActive
            ? data.currentStreak + " DAYS LEFT  ·  " + data.completionRate + "% DONE"
            : data.currentStreak + " DAY STREAK  ·  " + data.completionRate + "%";
        tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        tp.setTextSize(12f * dp);
        tp.setAntiAlias(true);

        if (data.isGoalActive && data.accentColor != null) {
            try { tp.setColor(Color.parseColor(data.accentColor)); }
            catch (Exception e) { tp.setColor(fg[0]); }
        } else {
            tp.setColor(fg[0]);
        }

        float tw   = tp.measureText(text);
        float ph   = 14f * dp;
        float pv   = 7f * dp;
        float pw   = tw + ph * 2;
        float pht  = tp.getTextSize() + pv * 2;

        float px;
        if ("left".equals(data.statsAlignment)) {
            px = gridLeft;
            tp.setTextAlign(Paint.Align.LEFT);
        } else if ("right".equals(data.statsAlignment)) {
            px = gridRight - pw;
            tp.setTextAlign(Paint.Align.RIGHT);
        } else {
            px = gridLeft + (gridRight - gridLeft) / 2f - pw / 2f;
            tp.setTextAlign(Paint.Align.CENTER);
        }

        PILL_BG_PAINT.setColor("mono".equals(data.themeKey)
            ? Color.parseColor("#15000000") : Color.parseColor("#26FFFFFF"));
        RectF pr = new RectF(px, pillTopY, px + pw, pillTopY + pht);
        canvas.drawRoundRect(pr, pht / 2f, pht / 2f, PILL_BG_PAINT);

        float textX;
        if ("left".equals(data.statsAlignment)) {
            textX = px + ph;
        } else if ("right".equals(data.statsAlignment)) {
            textX = px + pw - ph;
        } else {
            textX = px + pw / 2f;
        }
        
        canvas.drawText(text, textX, pillTopY + pv + tp.getTextSize() * 0.82f, tp);

        // Draw habit texts above the stats pill, respecting statsAlignment
        if (data.habitText != null && data.habitText.length > 0) {
            tp.setTextSize(10f * dp);
            tp.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            tp.setColor(fg[0]);
            tp.setAlpha(200);
            
            float textHabitX;
            if ("left".equals(data.statsAlignment)) {
                textHabitX = gridLeft;
                tp.setTextAlign(Paint.Align.LEFT);
            } else if ("right".equals(data.statsAlignment)) {
                textHabitX = gridRight;
                tp.setTextAlign(Paint.Align.RIGHT);
            } else {
                textHabitX = gridLeft + (gridRight - gridLeft) / 2f;
                tp.setTextAlign(Paint.Align.CENTER);
            }

            float startYHabits = pillTopY - 14f * dp - (data.habitText.length - 1) * (14f * dp);
            for (int i = 0; i < data.habitText.length; i++) {
                canvas.drawText(data.habitText[i].toUpperCase(), textHabitX, startYHabits + i * (14f * dp), tp);
            }
            tp.setAlpha(255);
        }
    }

    // ── Utility ─────────────────────────────────────────────────────────

    public static Bitmap decodeSampledBitmapFromFile(String path, int reqWidth, int reqHeight) {
        try {
            if (path == null) return null;
            File file = new File(path);
            if (!file.exists() || file.length() == 0) return null;

            final BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(path, options);

            int targetW = reqWidth > 0 ? reqWidth : 1080;
            int targetH = reqHeight > 0 ? reqHeight : 1920;

            int inSampleSize = 1;
            if (options.outHeight > targetH || options.outWidth > targetW) {
                final int halfHeight = options.outHeight / 2;
                final int halfWidth = options.outWidth / 2;
                while ((halfHeight / inSampleSize) >= targetH && (halfWidth / inSampleSize) >= targetW) {
                    inSampleSize *= 2;
                }
            }

            options.inSampleSize = Math.max(1, inSampleSize);
            options.inJustDecodeBounds = false;
            options.inPreferredConfig = Bitmap.Config.RGB_565; // Uses half RAM of ARGB_8888
            options.inDither = true;

            return BitmapFactory.decodeFile(path, options);
        } catch (Throwable t) {
            t.printStackTrace();
            return null;
        }
    }

    private static int clamp(int level) {
        return Math.max(0, Math.min(3, level));
    }

    // ── WallpaperService ────────────────────────────────────────────────

    @Override public Engine onCreateEngine() { return new GrainEngine(); }

    private class GrainEngine extends Engine
            implements SharedPreferences.OnSharedPreferenceChangeListener {

        private final Handler handler = new Handler();
        private boolean visible = true;
        private WallpaperData cachedData = new WallpaperData();
        private final Runnable drawRunner = this::draw;

        private final BroadcastReceiver timeChangedReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (visible) {
                    reloadData();
                    handler.post(drawRunner);
                }
            }
        };

        @Override
        public void onCreate(SurfaceHolder s) {
            super.onCreate(s);
            try {
                SharedPreferences p = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                p.registerOnSharedPreferenceChangeListener(this);

                IntentFilter filter = new IntentFilter();
                filter.addAction(Intent.ACTION_DATE_CHANGED);
                filter.addAction(Intent.ACTION_TIME_CHANGED);
                filter.addAction(Intent.ACTION_TIMEZONE_CHANGED);
                registerReceiver(timeChangedReceiver, filter);
            } catch (Throwable t) {
                t.printStackTrace();
            }

            reloadData();
        }

        @Override
        public void onDestroy() {
            super.onDestroy();
            handler.removeCallbacks(drawRunner);
            try {
                unregisterReceiver(timeChangedReceiver);
            } catch (Throwable ignored) {}
            try {
                SharedPreferences p = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                p.unregisterOnSharedPreferenceChangeListener(this);
            } catch (Throwable ignored) {}
        }

        @Override
        public void onSharedPreferenceChanged(SharedPreferences p, String key) {
            if (KEY_LIVE_DATA.equals(key) || KEY_PHOTO_PATH.equals(key)) {
                reloadData();
                if (visible) handler.post(drawRunner);
            }
        }

        @Override
        public void onVisibilityChanged(boolean v) {
            visible = v;
            if (v) { reloadData(); handler.post(drawRunner); }
            else   { handler.removeCallbacks(drawRunner); }
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder h) {
            super.onSurfaceDestroyed(h);
            visible = false;
            handler.removeCallbacks(drawRunner);
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder h, int format, int w, int ht) {
            super.onSurfaceChanged(h, format, w, ht);
            reloadData();
            draw();
        }

        private void reloadData() {
            try {
                SharedPreferences p = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                cachedData = WallpaperData.fromJson(p.getString(KEY_LIVE_DATA, null));
            } catch (Throwable t) {
                t.printStackTrace();
            }
        }

        private void draw() {
            SurfaceHolder holder = getSurfaceHolder();
            if (holder == null) return;
            Canvas canvas = null;
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    try {
                        canvas = holder.lockHardwareCanvas();
                    } catch (Throwable fallback) {
                        canvas = holder.lockCanvas();
                    }
                } else {
                    canvas = holder.lockCanvas();
                }
                if (canvas != null) {
                    drawHeatmapToCanvas(GrainWallpaperService.this, canvas,
                                        canvas.getWidth(), canvas.getHeight(), cachedData);
                }
            } catch (Throwable t) {
                t.printStackTrace();
            } finally {
                if (canvas != null) {
                    try {
                        holder.unlockCanvasAndPost(canvas);
                    } catch (Throwable t) {
                        t.printStackTrace();
                    }
                }
            }
        }
    }
}

