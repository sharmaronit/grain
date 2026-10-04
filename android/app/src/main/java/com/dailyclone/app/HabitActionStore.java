package com.dailyclone.app;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.util.UUID;

/** Native mirror and durable outbox. WebView localStorage remains authoritative. */
final class HabitActionStore {
    private HabitActionStore() {}
    private static JSONObject state(Context context) {
        try { return new JSONObject(context.getSharedPreferences("grain_actions", 0).getString("state", "{}")); }
        catch (Exception e) { throw new IllegalStateException("Habit action data could not be read", e); }
    }
    private static void save(Context context, JSONObject state) {
        if (!context.getSharedPreferences("grain_actions", 0).edit().putString("state", state.toString()).commit())
            throw new IllegalStateException("Habit action could not be saved");
    }
    static synchronized JSONObject snapshot(Context context) {
        return state(context).optJSONObject("snapshot") == null ? new JSONObject() : state(context).optJSONObject("snapshot");
    }
    static synchronized JSONArray pending(Context context) {
        JSONArray pending = state(context).optJSONArray("queue");
        return pending == null ? new JSONArray() : pending;
    }
    static synchronized void synchronize(Context context, JSONObject snapshot, JSONArray ackIds) throws Exception {
        JSONObject state = state(context);
        JSONArray remaining = new JSONArray();
        JSONArray queue = state.optJSONArray("queue");
        JSONObject history = state.optJSONObject("history");
        if (history == null) history = new JSONObject();
        JSONObject canonicalReceipts = snapshot.optJSONObject("receipts");
        if (canonicalReceipts != null) for (int j = 0; j < ackIds.length(); j++) {
            String id = ackIds.getString(j);
            if (canonicalReceipts.has(id)) history.put(id, canonicalReceipts.get(id));
        }
        snapshot.remove("receipts");
        if (queue != null) for (int i = 0; i < queue.length(); i++) {
            JSONObject action = queue.getJSONObject(i);
            boolean acknowledged = false;
            for (int j = 0; j < ackIds.length(); j++) if (action.getString("id").equals(ackIds.getString(j))) acknowledged = true;
            if (!acknowledged) {
                remaining.put(action);
                if (action.optString("userId").equals(snapshot.optString("userId"))) apply(snapshot, action, history, false);
            }
        }
        java.util.Set<String> keep = new java.util.HashSet<>();
        for (int i = 0; i < remaining.length(); i++) {
            JSONObject a = remaining.getJSONObject(i); keep.add(a.optString("id")); keep.add(a.optString("referenceId"));
        }
        java.util.List<String> expired = new java.util.ArrayList<>();
        java.util.Iterator<String> keys = history.keys();
        String cutoff = LocalDate.now().minusDays(7).toString();
        while (keys.hasNext()) {
            String id = keys.next(); JSONObject receipt = history.optJSONObject(id);
            if (receipt != null && receipt.optString("dateKey").compareTo(cutoff) < 0 && !keep.contains(id)) expired.add(id);
        }
        for (String id : expired) history.remove(id);
        state.put("snapshot", snapshot).put("queue", remaining).put("history", history);
        save(context, state);
    }
    static JSONObject habit(JSONObject snapshot, String id) {
        JSONArray habits = snapshot.optJSONArray("habits");
        if (habits != null) for (int i = 0; i < habits.length(); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit != null && id.equals(habit.optString("id"))) return habit;
        }
        return null;
    }
    static boolean scheduled(JSONObject habit, LocalDate date) {
        int dow = date.getDayOfWeek().getValue() - 1;
        String frequency = habit.optString("frequency", "daily");
        if (frequency.equals("weekdays")) return dow < 5;
        if (frequency.equals("custom")) {
            JSONArray days = habit.optJSONArray("customDays");
            if (days == null) return true;
            for (int i = 0; i < days.length(); i++) if (days.optInt(i, -1) == dow) return true;
            return false;
        }
        return true;
    }
    static JSONObject entry(JSONObject snapshot, String date, String habitId) {
        JSONObject all = snapshot.optJSONObject("completions");
        JSONObject day = all == null ? null : all.optJSONObject(date);
        return day == null ? null : day.optJSONObject(habitId);
    }
    static boolean pending(JSONObject entry) {
        return entry == null || !(entry.optBoolean("done") || entry.optBoolean("restDay") || entry.optBoolean("skipped") || entry.optBoolean("frozenStreak"));
    }
    static boolean acceptsActionSource(JSONObject snapshot, boolean fromWidget) {
        return !fromWidget || snapshot.optBoolean("widgetsEnabled", true);
    }
    static synchronized String perform(Context context, String userId, String habitId, String date, String operation, String referenceId, boolean fromWidget) throws Exception {
        JSONObject state = state(context);
        JSONObject snapshot = state.optJSONObject("snapshot");
        // A stale widget/notification may never complete a different day or account.
        if (snapshot == null || userId.isEmpty() || !userId.equals(snapshot.optString("userId")) || !LocalDate.now().toString().equals(date)) return null;
        if (!acceptsActionSource(snapshot, fromWidget)) return null;
        JSONObject habit = habit(snapshot, habitId);
        if (habit == null || !scheduled(habit, LocalDate.now())) return null;
        JSONObject history = state.optJSONObject("history");
        if (history == null) history = new JSONObject();
        String id = UUID.randomUUID().toString();
        java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US);
        formatter.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        JSONObject action = new JSONObject().put("id", id).put("userId", userId).put("habitId", habitId)
                .put("dateKey", date).put("operation", operation).put("at", formatter.format(new java.util.Date())).put("referenceId", referenceId);
        if (!apply(snapshot, action, history, true)) return null;
        JSONArray queue = state.optJSONArray("queue");
        if (queue == null) queue = new JSONArray();
        queue.put(action);
        state.put("queue", queue).put("snapshot", snapshot).put("history", history).put("lastAction", action);
        save(context, state);
        return id;
    }
    private static boolean same(JSONObject a, JSONObject b) {
        if (a == null || b == null) return a == b;
        if (a.length() != b.length()) return false;
        java.util.Iterator<String> keys = a.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (a.opt(key) instanceof Number && b.opt(key) instanceof Number) {
                if (Double.compare(((Number) a.opt(key)).doubleValue(), ((Number) b.opt(key)).doubleValue()) != 0) return false;
                continue;
            }
            if (!b.has(key) || !String.valueOf(a.opt(key)).equals(String.valueOf(b.opt(key)))) return false;
        }
        return true;
    }
    static boolean apply(JSONObject snapshot, JSONObject action, JSONObject history, boolean record) throws Exception {
        String habitId = action.getString("habitId"), date = action.getString("dateKey");
        JSONObject habit = habit(snapshot, habitId);
        if (habit == null) return false;
        JSONObject before = entry(snapshot, date, habitId);
        JSONObject after = before == null ? new JSONObject().put("done", false).put("value", JSONObject.NULL).put("note", "")
                .put("restDay", false).put("frozenStreak", false).put("completedAt", JSONObject.NULL) : new JSONObject(before.toString());
        String operation = action.optString("operation");
        if (operation.equals("undo")) {
            JSONObject receipt = history.optJSONObject(action.optString("referenceId"));
            if (receipt == null || !habitId.equals(receipt.optString("habitId")) || !date.equals(receipt.optString("dateKey")) || !same(before, receipt.optJSONObject("after"))) return false;
            after = receipt.optJSONObject("before");
        } else {
            if (!pending(before)) return false;
            if (habit.optString("type").equals("numeric")) {
                double target = Math.max(1, habit.optDouble("target", 1));
                double value = Math.min(target, Math.max(0, after.optDouble("value", 0)) + 1);
                after.put("value", value).put("done", value >= target);
            } else after.put("done", true);
            if (after.optBoolean("done")) after.put("completedAt", action.getString("at"));
        }
        JSONObject all = snapshot.optJSONObject("completions");
        if (all == null) all = new JSONObject();
        JSONObject day = all.optJSONObject(date);
        if (day == null) day = new JSONObject();
        if (after == null) day.remove(habitId); else day.put(habitId, after);
        all.put(date, day);
        snapshot.put("completions", all);
        if (record) history.put(action.getString("id"), new JSONObject().put("habitId", habitId).put("dateKey", date)
                .put("before", before == null ? JSONObject.NULL : new JSONObject(before.toString()))
                .put("after", after == null ? JSONObject.NULL : new JSONObject(after.toString())));
        return true;
    }
    static synchronized JSONObject lastAction(Context context) {
        JSONObject state = state(context), action = state.optJSONObject("lastAction");
        if (action == null || action.optString("operation").equals("undo") || !action.optString("dateKey").equals(LocalDate.now().toString()) ||
                !action.optString("userId").equals(snapshot(context).optString("userId"))) return null;
        return undoAvailable(context, action.optString("id")) ? action : null;
    }
    static synchronized boolean undoAvailable(Context context, String referenceId) {
        JSONObject state = state(context), history = state.optJSONObject("history"), snapshot = state.optJSONObject("snapshot");
        JSONObject receipt = history == null ? null : history.optJSONObject(referenceId);
        return receipt != null && snapshot != null && receipt.optString("dateKey").equals(LocalDate.now().toString()) &&
                same(entry(snapshot, receipt.optString("dateKey"), receipt.optString("habitId")), receipt.optJSONObject("after"));
    }
}
