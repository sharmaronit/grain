package com.dailyclone.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

final class HabitReminders {
    private static final String CHANNEL = "grain_habit_actions";
    static Intent intent(Context context, JSONObject snapshot, String habitId, String date, String operation) {
        String user = snapshot.optString("userId", "");
        return new Intent(context, HabitActionReceiver.class).setAction("com.dailyclone.app.HABIT_ACTION")
                .setData(Uri.parse("grain://habit/" + Uri.encode(user) + "/" + Uri.encode(habitId) + "/" + date + "/" + operation))
                .putExtra("userId", user).putExtra("habitId", habitId).putExtra("dateKey", date).putExtra("operation", operation);
    }
    static PendingIntent pending(Context context, Intent intent) {
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private static void alarm(Context context, Intent intent, long time) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent action = pending(context, intent);
        if (android.os.Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()) {
            try {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, action);
                return;
            } catch (SecurityException ignored) { /* Access can be revoked while rescheduling. */ }
        }
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, action);
    }
    static synchronized void reschedule(Context context) {
        try {
            JSONObject snapshot = HabitActionStore.snapshot(context);
            // Cancel only alarms owned by this scheduler, including removed habits/accounts.
            android.content.SharedPreferences prefs = context.getSharedPreferences("grain_reminder_alarms", 0);
            JSONArray old = new JSONArray(prefs.getString("scheduled", "[]"));
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            for (int i = 0; i < old.length(); i++) {
                Intent intent = Intent.parseUri(old.getString(i), Intent.URI_INTENT_SCHEME);
                PendingIntent pi = pending(context, intent);
                manager.cancel(pi);
                pi.cancel();
            }
            JSONArray scheduled = new JSONArray();
            if (!snapshot.isNull("userId") && !snapshot.optString("userId").isEmpty()) {
                LocalDate today = LocalDate.now();
                Intent midnight = intent(context, snapshot, "", today.plusDays(1).toString(), "refresh");
                alarm(context, midnight, today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli());
                scheduled.put(midnight.toUri(Intent.URI_INTENT_SCHEME));
                if (snapshot.optBoolean("enabled")) {
                    JSONArray habits = snapshot.optJSONArray("habits");
                    if (habits != null) for (int i = 0; i < habits.length(); i++) {
                        JSONObject habit = habits.getJSONObject(i);
                        scheduleNext(context, snapshot, habit, habit.optString("reminderTime", snapshot.optString("reminderTime", "20:00")), scheduled, null);
                    }
                    if (snapshot.optBoolean("dailySummary")) scheduleNext(context, snapshot, null, snapshot.optString("reminderTime", "20:00"), scheduled, "summary");
                    if (snapshot.optBoolean("morningKickoff")) scheduleNext(context, snapshot, null, "08:00", scheduled, "summary-morning");
                } else NotificationManagerCompat.from(context).cancelAll();
            } else NotificationManagerCompat.from(context).cancelAll();
            prefs.edit().putString("scheduled", scheduled.toString()).apply();
            refreshNotifications(context, snapshot);
        } catch (Exception e) { android.util.Log.e("GrainReminders", "Could not schedule reminders", e); }
    }
    private static void scheduleNext(Context context, JSONObject snapshot, JSONObject habit, String time, JSONArray scheduled, String summaryId) throws Exception {
        LocalTime parsed;
        try { parsed = LocalTime.parse(time.isEmpty() ? snapshot.optString("reminderTime", "20:00") : time); }
        catch (Exception e) { parsed = LocalTime.of(20, 0); }
        for (int i = 0; i < 14; i++) {
            LocalDate date = LocalDate.now().plusDays(i);
            long trigger = date.atTime(parsed).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            String id = habit == null ? summaryId : habit.optString("id");
            if (trigger <= System.currentTimeMillis() || (habit != null && (!HabitActionStore.scheduled(habit, date) || !HabitActionStore.pending(HabitActionStore.entry(snapshot, date.toString(), id))))) continue;
            Intent intent = intent(context, snapshot, id, date.toString(), "remind");
            alarm(context, intent, trigger);
            scheduled.put(intent.toUri(Intent.URI_INTENT_SCHEME));
            return;
        }
    }
    static void deliver(Context context, Intent intent) {
        JSONObject snapshot = HabitActionStore.snapshot(context);
        String id = intent.getStringExtra("habitId"), date = intent.getStringExtra("dateKey");
        if (!snapshot.optBoolean("enabled") || !snapshot.optString("userId").equals(intent.getStringExtra("userId")) || !LocalDate.now().toString().equals(date)) return;
        if ("summary".equals(id) || "summary-morning".equals(id)) {
            JSONArray habits = snapshot.optJSONArray("habits");
            int remaining = 0;
            if (habits != null) for (int i = 0; i < habits.length(); i++) {
                JSONObject h = habits.optJSONObject(i);
                if (h != null && HabitActionStore.scheduled(h, LocalDate.now()) && HabitActionStore.pending(HabitActionStore.entry(snapshot, date, h.optString("id")))) remaining++;
            }
            if (remaining > 0 && ("summary".equals(id) ? snapshot.optBoolean("dailySummary") : snapshot.optBoolean("morningKickoff")))
                show(context, id, "Grain · Your day", remaining + " habit" + (remaining == 1 ? "" : "s") + " left today", snapshot, null, null);
            return;
        }
        JSONObject habit = HabitActionStore.habit(snapshot, id);
        if (habit != null && HabitActionStore.scheduled(habit, LocalDate.now()) && HabitActionStore.pending(HabitActionStore.entry(snapshot, date, id)))
            showHabit(context, snapshot, habit, null);
    }
    static void snooze(Context context, Intent intent) {
        JSONObject snapshot = HabitActionStore.snapshot(context);
        if (!snapshot.optBoolean("enabled") || !snapshot.optString("userId").equals(intent.getStringExtra("userId")) || !LocalDate.now().toString().equals(intent.getStringExtra("dateKey"))) return;
        String id = intent.getStringExtra("habitId");
        Intent later = intent(context, snapshot, id, LocalDate.now().toString(), "remind-snoozed");
        later.putExtra("operation", "remind");
        alarm(context, later, System.currentTimeMillis() + 15 * 60_000);
        NotificationManagerCompat.from(context).cancel("grain-habit:" + id, 1);
    }
    static void afterAction(Context context, String habitId, String referenceId, String operation) {
        JSONObject snapshot = HabitActionStore.snapshot(context), habit = HabitActionStore.habit(snapshot, habitId);
        if (habit != null && snapshot.optBoolean("enabled")) showHabit(context, snapshot, habit, "undo".equals(operation) ? null : referenceId);
    }
    private static void refreshNotifications(Context context, JSONObject snapshot) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        for (android.service.notification.StatusBarNotification notification : manager.getActiveNotifications()) {
            if (notification.getTag() == null || !notification.getTag().startsWith("grain-habit:")) continue;
            android.os.Bundle extras = notification.getNotification().extras;
            String id = extras.getString("grain_habit", ""), reference = extras.getString("grain_reference");
            if (!snapshot.optBoolean("enabled") || !snapshot.optString("userId").equals(extras.getString("grain_user")) || !LocalDate.now().toString().equals(extras.getString("grain_date"))) {
                manager.cancel(notification.getTag(), notification.getId()); continue;
            }
            if ("summary".equals(id) || "summary-morning".equals(id)) {
                if (!("summary".equals(id) ? snapshot.optBoolean("dailySummary") : snapshot.optBoolean("morningKickoff"))) manager.cancel(notification.getTag(), notification.getId());
                continue;
            }
            if ("test".equals(id)) continue;
            JSONObject habit = HabitActionStore.habit(snapshot, id);
            boolean undoable = reference != null && HabitActionStore.undoAvailable(context, reference);
            if (habit == null || !HabitActionStore.scheduled(habit, LocalDate.now()) || (!HabitActionStore.pending(HabitActionStore.entry(snapshot, LocalDate.now().toString(), id)) && !undoable))
                manager.cancel(notification.getTag(), notification.getId());
            else showHabit(context, snapshot, habit, undoable ? reference : null);
        }
    }
    private static String progress(JSONObject habit, JSONObject entry) {
        double value = entry == null ? 0 : entry.optDouble("value", 0);
        return number(value) + " / " + number(Math.max(1, habit.optDouble("target", 1))) + " " + habit.optString("unit", "");
    }
    static String number(double value) { return value == Math.floor(value) ? Long.toString((long) value) : Double.toString(value); }
    private static void showHabit(Context context, JSONObject snapshot, JSONObject habit, String referenceId) {
        JSONObject entry = HabitActionStore.entry(snapshot, LocalDate.now().toString(), habit.optString("id"));
        String body = !HabitActionStore.pending(entry) ? "A promise kept. Well done." : habit.optString("type").equals("numeric") ? progress(habit, entry) : "One small action. A little more discipline.";
        show(context, habit.optString("id"), habit.optString("name"), body, snapshot, habit, referenceId);
    }
    private static void show(Context context, String id, String title, String body, JSONObject snapshot, JSONObject habit, String referenceId) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Habit actions", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Complete habits directly from reminders");
            manager.createNotificationChannel(channel);
        }
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        android.os.Bundle metadata = new android.os.Bundle();
        metadata.putString("grain_user", snapshot.optString("userId")); metadata.putString("grain_date", LocalDate.now().toString());
        metadata.putString("grain_habit", id); metadata.putString("grain_reference", referenceId);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL).setSmallIcon(R.drawable.ic_stat_grain)
                .addExtras(metadata)
                .setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE))
                .setAutoCancel(true).setOnlyAlertOnce(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        if (habit != null) {
            String date = LocalDate.now().toString();
            if (HabitActionStore.pending(HabitActionStore.entry(snapshot, date, id))) {
                boolean numeric = habit.optString("type").equals("numeric");
                builder.addAction(0, numeric ? "+1" : "Done", pending(context, intent(context, snapshot, id, date, numeric ? "increment" : "complete")));
                builder.addAction(0, "Later · 15 min", pending(context, intent(context, snapshot, id, date, "snooze")));
            }
            if (referenceId != null) {
                Intent undo = intent(context, snapshot, id, date, "undo").putExtra("referenceId", referenceId);
                undo.setData(Uri.parse(undo.getDataString() + "/" + referenceId));
                builder.addAction(0, "Undo", pending(context, undo));
            }
        }
        try { manager.notify("grain-habit:" + id, 1, builder.build()); }
        catch (SecurityException ignored) { /* Permission may have changed since scheduling. */ }
    }
    static boolean test(Context context) {
        JSONObject snapshot = HabitActionStore.snapshot(context);
        JSONArray habits = snapshot.optJSONArray("habits");
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled() || habits == null) return false;
        for (int i = 0; i < habits.length(); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit != null && HabitActionStore.scheduled(habit, LocalDate.now()) && HabitActionStore.pending(HabitActionStore.entry(snapshot, LocalDate.now().toString(), habit.optString("id")))) {
                showHabit(context, snapshot, habit, null); return true;
            }
        }
        show(context, "test", "Grain", "Notifications are ready. Your habits are complete for today.", snapshot, null, null);
        return true;
    }
}
