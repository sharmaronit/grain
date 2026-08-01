package com.dailyclone.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Handler;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;

public class GrainWallpaperService extends WallpaperService {

    // ── Shared static renderer ──────────────────────────────────────────
    // Used by both the live wallpaper engine AND WallpaperPlugin for static
    // bitmap fallback. Accepts a parsed WallpaperData instead of raw JSON
    // so callers can cache the parse step.

    public static class WallpaperData {
        public int[][] heatmap;
        public String themeKey = "amoled";
        public int previewWeeks = 26;
        public int currentStreak = 0;
        public int completionRate = 0;

        /** Parse from a JSON string stored in SharedPreferences. */
        public static WallpaperData fromJson(String jsonStr) {
            WallpaperData d = new WallpaperData();
            if (jsonStr == null) return d;
            try {
                JSONObject obj = new JSONObject(jsonStr);
                d.themeKey = obj.optString("theme", "amoled");
                d.previewWeeks = Math.max(12, Math.min(52, obj.optInt("previewWeeks", 26)));
                d.currentStreak = obj.optInt("currentStreak", 0);
                d.completionRate = obj.optInt("completionRate", 0);

                JSONArray arr = obj.optJSONArray("heatmap");
                if (arr != null) {
                    int cols = arr.length();
                    d.heatmap = new int[cols][7];
                    for (int i = 0; i < cols; i++) {
                        JSONArray colArr = arr.optJSONArray(i);
                        if (colArr != null) {
                            for (int j = 0; j < Math.min(colArr.length(), 7); j++) {
                                d.heatmap[i][j] = colArr.optInt(j, 0);
                            }
                        }
                    }
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
            return d;
        }
    }

    /** Resolve theme colors from a theme key. */
    private static void resolveTheme(String themeKey,
                                     int[] bgOut, int[] fgOut, int[] accentOut,
                                     int[][] intensityOut) {
        switch (themeKey != null ? themeKey : "amoled") {
            case "mono":
                bgOut[0] = Color.parseColor("#E9E9EA");
                fgOut[0] = Color.parseColor("#111111");
                accentOut[0] = Color.parseColor("#059669");
                intensityOut[0] = new int[]{
                    Color.parseColor("#D4D4D8"),
                    Color.parseColor("#A1A1AA"),
                    Color.parseColor("#059669"),
                    Color.parseColor("#16A34A")
                };
                break;
            case "slate":
                bgOut[0] = Color.parseColor("#1F2937");
                fgOut[0] = Color.parseColor("#E5E7EB");
                accentOut[0] = Color.parseColor("#38BDF8");
                intensityOut[0] = new int[]{
                    Color.parseColor("#334155"),
                    Color.parseColor("#475569"),
                    Color.parseColor("#38BDF8"),
                    Color.parseColor("#7DD3FC")
                };
                break;
            case "neon":
                bgOut[0] = Color.parseColor("#11052C");
                fgOut[0] = Color.parseColor("#FFFFFF");
                accentOut[0] = Color.parseColor("#F472B6");
                intensityOut[0] = new int[]{
                    Color.argb(40, 255, 255, 255),
                    Color.argb(90, 255, 255, 255),
                    Color.parseColor("#F472B6"),
                    Color.parseColor("#22D3EE")
                };
                break;
            default: // amoled
                bgOut[0] = Color.parseColor("#000000");
                fgOut[0] = Color.parseColor("#FFFFFF");
                accentOut[0] = Color.parseColor("#22C55E");
                intensityOut[0] = new int[]{
                    Color.parseColor("#2A2A2A"),
                    Color.parseColor("#3F3F46"),
                    Color.parseColor("#166534"),
                    Color.parseColor("#22C55E")
                };
                break;
        }
    }

    /**
     * Draw the full heatmap + stats pill onto a Canvas.
     * This is the single source of truth for rendering — used by both the
     * live wallpaper engine and the static bitmap fallback in WallpaperPlugin.
     */
    public static void drawHeatmapToCanvas(Context context, Canvas canvas,
                                           int width, int height,
                                           WallpaperData data) {
        if (data == null) data = new WallpaperData();

        int[] bg = {0}, fg = {0}, accent = {0};
        int[][] intensity = {null};
        resolveTheme(data.themeKey, bg, fg, accent, intensity);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint pillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

        // ── Background ──
        if ("neon".equals(data.themeKey)) {
            LinearGradient shader = new LinearGradient(
                0, 0, width, height,
                new int[]{Color.parseColor("#EC4899"),
                           Color.parseColor("#8B5CF6"),
                           Color.parseColor("#06B6D4")},
                null, Shader.TileMode.CLAMP);
            paint.setShader(shader);
            canvas.drawRect(0, 0, width, height, paint);
            paint.setShader(null);
        } else {
            canvas.drawColor(bg[0]);
        }

        // ── No data state ──
        if (data.heatmap == null || data.heatmap.length == 0) {
            textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            textPaint.setTextSize(14f * context.getResources().getDisplayMetrics().density);
            textPaint.setColor(fg[0]);
            textPaint.setTextAlign(Paint.Align.CENTER);
            textPaint.setAlpha(120);
            canvas.drawText("Open Grain to sync your habits",
                            width / 2f, height * 0.55f, textPaint);
            return;
        }

        // ── Heatmap grid ──
        int colsToDraw = Math.min(data.previewWeeks, data.heatmap.length);
        int startCol = Math.max(0, data.heatmap.length - colsToDraw);

        float density = context.getResources().getDisplayMetrics().density;
        float padding = 24f * density;
        float gap = colsToDraw > 40 ? 2f * density : 3f * density;

        float availableWidth = width - (padding * 2);
        float totalGapWidth = (colsToDraw - 1) * gap;
        float sqSize = (availableWidth - totalGapWidth) / colsToDraw;
        if (sqSize > 24f * density) sqSize = 24f * density;

        float gridWidth = (colsToDraw * sqSize) + totalGapWidth;
        float gridHeight = (7 * sqSize) + (6 * gap);

        float startY = (height * 0.54f) - (gridHeight / 2f);
        float startX = (width - gridWidth) / 2f;

        // Today's position
        Calendar cal = Calendar.getInstance();
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK); // 1=Sun, 2=Mon…
        int todayRow = (dayOfWeek + 5) % 7; // 0=Mon … 6=Sun
        int todayColIdx = colsToDraw - 1;

        for (int i = 0; i < colsToDraw; i++) {
            int actualCol = startCol + i;
            float x = startX + (i * (sqSize + gap));
            for (int j = 0; j < 7; j++) {
                float y = startY + (j * (sqSize + gap));

                int level = data.heatmap[actualCol][j];
                if (level < 0) level = 0;
                if (level > 3) level = 3;

                boolean isToday = (i == todayColIdx && j == todayRow);

                paint.setColor(intensity[0][level]);

                if (level >= 2 && !"mono".equals(data.themeKey)) {
                    paint.setShadowLayer(6f * density, 0, 0, intensity[0][level]);
                } else {
                    paint.clearShadowLayer();
                }

                RectF rect = new RectF(x, y, x + sqSize, y + sqSize);
                float cornerRadius = Math.max(2f * density, sqSize * 0.2f);
                canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint);

                if (isToday) {
                    paint.clearShadowLayer();
                    paint.setColor(accent[0]);
                    float dotRadius = sqSize * 0.25f;
                    canvas.drawCircle(rect.centerX(), rect.centerY(), dotRadius, paint);
                }
            }
        }
        paint.clearShadowLayer();

        // ── Stats pill ──
        String statsText = data.currentStreak + " DAY STREAK  ·  " + data.completionRate + "%";
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        textPaint.setTextSize(12f * density);
        textPaint.setColor(fg[0]);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setAntiAlias(true);
        textPaint.setSubpixelText(true);

        float textWidth = textPaint.measureText(statsText);
        float pillPaddingH = 14f * density;
        float pillPaddingV = 7f * density;
        float pillWidth = textWidth + (pillPaddingH * 2);
        float pillHeight = textPaint.getTextSize() + (pillPaddingV * 2);
        float pillY = startY + gridHeight + (24f * density);
        float pillX = (width - pillWidth) / 2f;

        int pillBg = "mono".equals(data.themeKey)
            ? Color.parseColor("#15000000")
            : Color.parseColor("#26FFFFFF");
        pillPaint.setColor(pillBg);
        RectF pillRect = new RectF(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
        canvas.drawRoundRect(pillRect, pillHeight / 2f, pillHeight / 2f, pillPaint);

        float textY = pillY + pillPaddingV + (textPaint.getTextSize() * 0.82f);
        canvas.drawText(statsText, width / 2f, textY, textPaint);
    }

    // ── WallpaperService entry point ────────────────────────────────────

    @Override
    public Engine onCreateEngine() {
        return new GrainEngine();
    }

    // ── Live wallpaper engine ───────────────────────────────────────────

    private class GrainEngine extends Engine
            implements SharedPreferences.OnSharedPreferenceChangeListener {

        private final Handler handler = new Handler();
        private boolean visible = true;

        // Cached parsed data — avoids re-reading SharedPreferences every frame
        private WallpaperData cachedData = new WallpaperData();

        private final Runnable drawRunner = this::draw;

        @Override
        public void onCreate(SurfaceHolder surfaceHolder) {
            super.onCreate(surfaceHolder);
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            prefs.registerOnSharedPreferenceChangeListener(this);
            reloadData();
        }

        @Override
        public void onDestroy() {
            super.onDestroy();
            handler.removeCallbacks(drawRunner);
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            prefs.unregisterOnSharedPreferenceChangeListener(this);
        }

        @Override
        public void onSharedPreferenceChanged(SharedPreferences prefs, String key) {
            if ("GRAIN_LIVE_DATA".equals(key)) {
                reloadData();
                if (visible) handler.post(drawRunner);
            }
        }

        @Override
        public void onVisibilityChanged(boolean visible) {
            this.visible = visible;
            if (visible) {
                reloadData();
                handler.post(drawRunner);
            } else {
                handler.removeCallbacks(drawRunner);
            }
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            super.onSurfaceDestroyed(holder);
            this.visible = false;
            handler.removeCallbacks(drawRunner);
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            reloadData();
            draw();
        }

        /** Read SharedPreferences once, parse into WallpaperData, cache. */
        private void reloadData() {
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String raw = prefs.getString("GRAIN_LIVE_DATA", null);
            cachedData = WallpaperData.fromJson(raw);
        }

        /** Draw a single frame using the cached data. */
        private void draw() {
            SurfaceHolder holder = getSurfaceHolder();
            Canvas canvas = null;
            try {
                canvas = holder.lockCanvas();
                if (canvas != null) {
                    drawHeatmapToCanvas(
                        GrainWallpaperService.this,
                        canvas,
                        canvas.getWidth(),
                        canvas.getHeight(),
                        cachedData
                    );
                }
            } finally {
                if (canvas != null) {
                    holder.unlockCanvasAndPost(canvas);
                }
            }
        }
    }
}
