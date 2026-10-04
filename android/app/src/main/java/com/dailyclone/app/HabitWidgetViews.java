package com.dailyclone.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

final class HabitWidgetViews {
    static boolean light(JSONObject snapshot) { return WidgetDesign.light(snapshot); }
    static int foreground(JSONObject snapshot) { return WidgetDesign.color(snapshot, "ink"); }
    static int muted(JSONObject snapshot) { return WidgetDesign.color(snapshot, "muted"); }
    static List<JSONObject> habits(Context context, JSONObject snapshot, int widgetId, boolean compact) {
        List<JSONObject> result = new ArrayList<>();
        if (!snapshot.optBoolean("widgetsEnabled", true)) return result;
        JSONArray all = snapshot.optJSONArray("habits");
        String key = "ids_" + widgetId;
        android.content.SharedPreferences prefs = context.getSharedPreferences("grain_widget_config", 0);
        String account = prefs.getString("user_" + widgetId, "");
        // Selections belong to an account; signing out never exposes old data.
        java.util.Set<String> selected = account.equals(snapshot.optString("userId")) ? prefs.getStringSet(key, java.util.Collections.emptySet()) : java.util.Collections.emptySet();
        if (all != null) for (int i = 0; i < all.length(); i++) {
            JSONObject habit = all.optJSONObject(i);
            if (habit == null || (!selected.isEmpty() && !selected.contains(habit.optString("id")))) continue;
            if (compact && !selected.isEmpty()) result.add(habit);
            else if (HabitActionStore.scheduled(habit, LocalDate.now()) && (compact || HabitActionStore.pending(HabitActionStore.entry(snapshot, LocalDate.now().toString(), habit.optString("id"))))) result.add(habit);
        }
        result.sort((a, b) -> Integer.compare(a.optInt("order"), b.optInt("order")));
        if (compact && result.size() > 1) {
            // Without a selection, prefer the first pending habit.
            for (JSONObject h : result) if (HabitActionStore.pending(HabitActionStore.entry(snapshot, LocalDate.now().toString(), h.optString("id")))) return java.util.Collections.singletonList(h);
            return java.util.Collections.singletonList(result.get(0));
        }
        return result;
    }
    private static Intent actionIntent(Context context, JSONObject snapshot, String habitId, String date, String operation) {
        Intent intent = HabitReminders.intent(context, snapshot, habitId, date, operation).putExtra("fromWidget", true);
        return intent.setData(Uri.parse(intent.getDataString() + "/widget"));
    }
    static RemoteViews row(Context context, JSONObject snapshot, JSONObject habit, boolean compact) {
        RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.grain_widget_row);
        JSONObject entry = HabitActionStore.entry(snapshot, LocalDate.now().toString(), habit.optString("id"));
        boolean scheduled = HabitActionStore.scheduled(habit, LocalDate.now());
        boolean pending = snapshot.optBoolean("widgetsEnabled", true) && HabitActionStore.pending(entry) && scheduled;
        boolean numeric = "numeric".equals(habit.optString("type"));
        row.setTextViewText(R.id.habit_name, habit.optString("name"));
        row.setTextColor(R.id.habit_name, foreground(snapshot));
        row.setTextColor(R.id.habit_value, muted(snapshot));
        String status = !scheduled ? "Not scheduled today" : !HabitActionStore.pending(entry) ? (entry != null && entry.optBoolean("done") ? "Complete" : "Resting today") : "Ready when you are";
        if (numeric && scheduled) status = HabitReminders.number(entry == null ? 0 : entry.optDouble("value", 0)) + " / " + HabitReminders.number(Math.max(1, habit.optDouble("target", 1))) + " " + habit.optString("unit", "");
        row.setTextViewText(R.id.habit_value, status);
        row.setTextViewText(R.id.habit_done, pending ? (numeric ? "+1" : "✓") : "✓");
        row.setInt(R.id.habit_done, "setBackgroundResource", WidgetDesign.button(snapshot));
        row.setTextColor(R.id.habit_done, foreground(snapshot));
        row.setViewVisibility(R.id.habit_done, pending ? View.VISIBLE : View.INVISIBLE);
        if (pending) {
            Intent action = actionIntent(context, snapshot, habit.optString("id"), LocalDate.now().toString(), numeric ? "increment" : "complete");
            if (compact) row.setOnClickPendingIntent(R.id.habit_done, HabitReminders.pending(context, action));
            else row.setOnClickFillInIntent(R.id.habit_done, action);
        }
        return row;
    }
    static void update(Context context, AppWidgetManager manager, int id, boolean compact) {
        try {
            JSONObject snapshot = WidgetDesign.snapshot(context, id);
            boolean enabled = snapshot.optBoolean("widgetsEnabled", true);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.grain_widget);
            if (compact) {
                int padding = Math.round(16 * context.getResources().getDisplayMetrics().density);
                views.setViewPadding(R.id.widget_root, padding, padding, padding, padding);
                views.setViewVisibility(R.id.widget_progress, View.GONE);
            }
            int background = WidgetDesign.background(snapshot);
            views.setInt(R.id.widget_root, "setBackgroundResource", background);
            views.setTextColor(R.id.widget_title, foreground(snapshot));
            views.setTextColor(R.id.widget_brand, muted(snapshot));
            views.setTextColor(R.id.widget_progress, muted(snapshot));
            views.setTextColor(R.id.widget_empty, muted(snapshot));
            views.setTextColor(R.id.widget_undo, foreground(snapshot));
            views.setTextColor(R.id.widget_configure, muted(snapshot));
            views.setTextColor(R.id.widget_add, foreground(snapshot));
            views.setTextViewText(R.id.widget_title, compact ? "One small action" : "Today");
            int total = 0, done = 0;
            JSONArray all = snapshot.optJSONArray("habits");
            if (all != null) for (int i = 0; i < all.length(); i++) {
                JSONObject h = all.optJSONObject(i);
                if (h != null && HabitActionStore.scheduled(h, LocalDate.now())) {
                    total++;
                    JSONObject e = HabitActionStore.entry(snapshot, LocalDate.now().toString(), h.optString("id"));
                    if (e != null && e.optBoolean("done")) done++;
                }
            }
            views.setTextViewText(R.id.widget_progress, done + " / " + total + " complete");
            views.setViewVisibility(R.id.widget_progress, enabled && !compact ? View.VISIBLE : View.GONE);
            List<JSONObject> habits = habits(context, snapshot, id, compact);
            views.setTextViewText(R.id.widget_empty, snapshot.isNull("userId") || snapshot.optString("userId").isEmpty() ? "Open Grain to get started" : total == 0 ? "No habits scheduled today" : done == total ? "All clear. A promise kept." : "No pending habits here");
            if (!enabled) views.setTextViewText(R.id.widget_empty, "Widgets paused. Enable them in Grain Settings.");
            views.setViewVisibility(R.id.widget_empty, habits.isEmpty() ? View.VISIBLE : View.GONE);
            views.setViewVisibility(R.id.widget_list, compact || habits.isEmpty() ? View.GONE : View.VISIBLE);
            views.setViewVisibility(R.id.widget_compact, compact && !habits.isEmpty() ? View.VISIBLE : View.GONE);
            views.removeAllViews(R.id.widget_compact);
            if (compact && !habits.isEmpty()) views.addView(R.id.widget_compact, row(context, snapshot, habits.get(0), true));
            if (!compact) {
                Intent template = new Intent(context, HabitActionReceiver.class).setAction("com.dailyclone.app.HABIT_ACTION").setData(Uri.parse("grain://widget/" + id)).putExtra("fromWidget", true);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (android.os.Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
                views.setPendingIntentTemplate(R.id.widget_list, PendingIntent.getBroadcast(context, id, template, flags));
                if (android.os.Build.VERSION.SDK_INT >= 31) {
                    RemoteViews.RemoteCollectionItems.Builder items = new RemoteViews.RemoteCollectionItems.Builder().setHasStableIds(false).setViewTypeCount(1);
                    for (int i = 0; i < habits.size(); i++) items.addItem(i, row(context, snapshot, habits.get(i), false));
                    views.setRemoteAdapter(R.id.widget_list, items.build());
                } else {
                    Intent service = new Intent(context, HabitWidgetService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).setData(Uri.parse("grain://widget-list/" + id));
                    views.setRemoteAdapter(R.id.widget_list, service);
                    views.setEmptyView(R.id.widget_list, R.id.widget_empty);
                }
            }
            Intent configure = new Intent(context, HabitWidgetConfigureActivity.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).setData(Uri.parse("grain://configure/" + id));
            views.setOnClickPendingIntent(R.id.widget_configure, PendingIntent.getActivity(context, id, configure, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            views.setViewVisibility(R.id.widget_configure, enabled ? View.VISIBLE : View.GONE);
            views.setViewVisibility(R.id.widget_add, enabled ? View.VISIBLE : View.GONE);
            Intent add = new Intent(context, MainActivity.class)
                .setAction("com.dailyclone.app.CREATE_HABIT")
                .setData(Uri.parse("grain://widget/create/" + id))
                .putExtra(HabitActionsPlugin.EXTRA_CREATE_HABIT, true)
                .putExtra(HabitActionsPlugin.EXTRA_WIDGET_USER, snapshot.optString("userId", ""))
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            views.setOnClickPendingIntent(R.id.widget_add, PendingIntent.getActivity(context, id + 100000, add, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            Intent open = new Intent(context, MainActivity.class);
            views.setOnClickPendingIntent(R.id.widget_title, PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            JSONObject last = HabitActionStore.lastAction(context);
            views.setViewVisibility(R.id.widget_undo, !enabled || last == null ? View.INVISIBLE : View.VISIBLE);
            if (enabled && last != null) {
                Intent undo = actionIntent(context, snapshot, last.optString("habitId"), last.optString("dateKey"), "undo").putExtra("referenceId", last.optString("id"));
                undo.setData(Uri.parse(undo.getDataString() + "/" + last.optString("id")));
                views.setOnClickPendingIntent(R.id.widget_undo, HabitReminders.pending(context, undo));
            }
            manager.updateAppWidget(id, views);
            if (android.os.Build.VERSION.SDK_INT < 31) manager.notifyAppWidgetViewDataChanged(id, R.id.widget_list);
        } catch (Exception e) { android.util.Log.e("GrainWidget", "Could not refresh widget", e); }
    }
}
