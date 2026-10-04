package com.dailyclone.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.view.View;
import android.widget.RemoteViews;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

final class HabitSummaryWidgetViews {
    // Count actual completions only: skipped/resting habits never fill the ring.
    static int[] counts(JSONObject snapshot, LocalDate date) {
        int total = 0, done = 0;
        JSONArray habits = snapshot.optJSONArray("habits");
        if (habits != null) for (int i = 0; i < habits.length(); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit == null || !HabitActionStore.scheduled(habit, date)) continue;
            String created = habit.optString("createdAt", "");
            if (!created.isEmpty()) {
                try {
                    LocalDate createdDate = java.time.Instant.parse(created).atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                    if (date.isBefore(createdDate)) continue;
                } catch (java.time.format.DateTimeParseException ignored) {
                    // Legacy snapshots may have no parseable creation timestamp.
                }
            }
            total++;
            JSONObject entry = HabitActionStore.entry(snapshot, date.toString(), habit.optString("id"));
            if (entry != null && entry.optBoolean("done")) done++;
        }
        return new int[] {done, total};
    }

    static Bitmap graphic(JSONObject snapshot, boolean heatmap, LocalDate today) {
        Bitmap bitmap = Bitmap.createBitmap(heatmap ? 560 : 320, heatmap ? 240 : 320, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        int accent = WidgetDesign.color(snapshot, "accent");
        int track = WidgetDesign.color(snapshot, "track");
        boolean dots = "dots".equals(WidgetDesign.of(snapshot));
        boolean botanical = "botanical".equals(WidgetDesign.of(snapshot));
        paint.setTextAlign(Paint.Align.CENTER);
        if (heatmap) {
            for (int i = 0; i < 7; i++) {
                LocalDate date = today.minusDays(6 - i);
                int[] count = counts(snapshot, date);
                float ratio = count[1] == 0 ? 0 : (float) count[0] / count[1];
                float x = 10 + i * 79;
                if (dots) {
                    for (int dot = 0; dot < 5; dot++) {
                        paint.setColor(dot < Math.round(ratio * 5) ? accent : track);
                        canvas.drawCircle(x + 33, 24 + (4 - dot) * 22, 8, paint);
                    }
                } else {
                    paint.setColor(track);
                    canvas.drawRoundRect(x, 35, x + 66, 116, 16, 16, paint);
                    if (ratio > 0) {
                        paint.setColor(accent);
                        paint.setAlpha(Math.round(65 + 190 * ratio));
                        canvas.drawRoundRect(x, 35, x + 66, 116, 16, 16, paint);
                        paint.setAlpha(255);
                    }
                }
                paint.setColor(HabitWidgetViews.muted(snapshot));
                paint.setTextSize(23);
                canvas.drawText(date.format(DateTimeFormatter.ofPattern("EE", Locale.getDefault())), x + 33, 157, paint);
                paint.setTextSize(21);
                canvas.drawText(count[0] + "/" + count[1], x + 33, 190, paint);
                if (date.equals(today)) {
                    paint.setColor(accent);
                    canvas.drawCircle(x + 33, 213, 4, paint);
                }
            }
        } else {
            int[] count = counts(snapshot, today);
            float ratio = count[1] == 0 ? 0 : (float) count[0] / count[1];
            if (dots || botanical) {
                if (dots) {
                    for (int dot = 0; dot < 25; dot++) {
                        paint.setColor(dot < Math.round(ratio * 25) ? accent : track);
                        canvas.drawCircle(88 + (dot % 5) * 36, 35 + (dot / 5) * 36, 11, paint);
                    }
                } else {
                    // A seed at zero; stem and leaves grow as today's habits are completed.
                    paint.setColor(track);
                    canvas.drawOval(95, 178, 225, 199, paint);
                    paint.setColor(accent);
                    canvas.drawCircle(160, 181, 8, paint);
                    if (ratio > 0) {
                        float top = 160 - 120 * ratio;
                        paint.setStyle(Paint.Style.STROKE);
                        paint.setStrokeWidth(7);
                        paint.setStrokeCap(Paint.Cap.ROUND);
                        canvas.drawLine(160, 181, 160, top, paint);
                        paint.setStyle(Paint.Style.FILL);
                        for (int leaf = 0; leaf < 1 + (int)(ratio * 3); leaf++) {
                            float y = top + leaf * 29;
                            float direction = leaf % 2 == 0 ? -1 : 1;
                            android.graphics.Path path = new android.graphics.Path();
                            path.moveTo(160, y + 25);
                            path.cubicTo(160 + direction * 45, y + 25, 160 + direction * 55, y - 20, 160, y + 25);
                            canvas.drawPath(path, paint);
                        }
                    }
                }
                paint.setColor(HabitWidgetViews.foreground(snapshot));
                paint.setTypeface(android.graphics.Typeface.create(dots ? "monospace" : "sans-serif", android.graphics.Typeface.BOLD));
                paint.setTextSize(46);
                canvas.drawText(Math.round(ratio * 100) + "%", 160, 255, paint);
                paint.setTypeface(android.graphics.Typeface.DEFAULT);
                paint.setColor(HabitWidgetViews.muted(snapshot));
                paint.setTextSize(21);
                canvas.drawText(botanical ? "Growing with you" : "complete", 160, 287, paint);
                return bitmap;
            }
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(18);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setColor(track);
            canvas.drawCircle(160, 160, 124, paint);
            if (ratio > 0) {
                paint.setColor(accent);
                canvas.drawArc(36, 36, 284, 284, -90, 360 * ratio, false, paint);
            }
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(HabitWidgetViews.foreground(snapshot));
            paint.setTextSize(58);
            paint.setTypeface(android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD));
            canvas.drawText(Math.round(ratio * 100) + "%", 160, 162, paint);
            paint.setTypeface(android.graphics.Typeface.DEFAULT);
            paint.setTextSize(23);
            paint.setColor(HabitWidgetViews.muted(snapshot));
            canvas.drawText("complete", 160, 199, paint);
        }
        return bitmap;
    }

    static void update(Context context, AppWidgetManager manager, int id, boolean heatmap) {
        try {
            JSONObject snapshot = WidgetDesign.snapshot(context, id);
            boolean signedIn = !snapshot.isNull("userId") && !snapshot.optString("userId").isEmpty();
            boolean enabled = snapshot.optBoolean("widgetsEnabled", true);
            LocalDate today = LocalDate.now();
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.grain_summary_widget);
            int background = WidgetDesign.background(snapshot);
            views.setInt(R.id.summary_root, "setBackgroundResource", background);
            views.setTextColor(R.id.summary_title, HabitWidgetViews.foreground(snapshot));
            views.setTextColor(R.id.summary_caption, HabitWidgetViews.muted(snapshot));
            views.setTextColor(R.id.summary_brand, HabitWidgetViews.muted(snapshot));
            views.setTextColor(R.id.summary_edit, HabitWidgetViews.muted(snapshot));
            views.setTextViewText(R.id.summary_title, heatmap ? "Weekly heatmap" : "Daily progress");
            views.setViewVisibility(R.id.summary_graphic, enabled && signedIn ? View.VISIBLE : View.GONE);
            String caption;
            if (!enabled) caption = "Widgets paused. Enable them in Grain Settings.";
            else if (!signedIn) caption = "Open Grain to get started";
            else {
                int[] count = counts(snapshot, today);
                int weeklyDone = 0;
                if (heatmap) for (int i = 0; i < 7; i++) weeklyDone += counts(snapshot, today.minusDays(i))[0];
                caption = heatmap ? "Last 7 days · " + weeklyDone + " habits completed"
                    : count[1] == 0 ? "No habits scheduled today" : count[0] + " / " + count[1] + " habits complete today";
                views.setImageViewBitmap(R.id.summary_graphic, graphic(snapshot, heatmap, today));
                views.setContentDescription(R.id.summary_graphic, heatmap ? heatmapDescription(snapshot, today) : caption);
            }
            views.setTextViewText(R.id.summary_caption, caption);
            views.setOnClickPendingIntent(R.id.summary_root, PendingIntent.getActivity(context, 0,
                new Intent(context, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            Intent configure = new Intent(context, HabitWidgetConfigureActivity.class)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).setData(android.net.Uri.parse("grain://configure/" + id));
            views.setOnClickPendingIntent(R.id.summary_edit, PendingIntent.getActivity(context, id, configure, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            views.setViewVisibility(R.id.summary_edit, enabled ? View.VISIBLE : View.GONE);
            manager.updateAppWidget(id, views);
        } catch (Exception e) { android.util.Log.e("GrainWidget", "Could not refresh summary widget", e); }
    }

    private static String heatmapDescription(JSONObject snapshot, LocalDate today) {
        StringBuilder description = new StringBuilder("Last seven days. ");
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            int[] count = counts(snapshot, date);
            description.append(date).append(": ").append(count[0]).append(" of ").append(count[1]).append(" complete. ");
        }
        return description.toString();
    }
}
