package com.dailyclone.app;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import java.time.LocalDate;
import static org.junit.Assert.*;

public class HabitActionStoreTest {
    private JSONObject snapshot(String type, int target) throws Exception {
        JSONObject habit = new JSONObject().put("id", "h1").put("name", "Study").put("type", type).put("target", target).put("frequency", "daily");
        return new JSONObject().put("habits", new JSONArray().put(habit)).put("completions", new JSONObject());
    }
    private JSONObject action(String id, String operation) throws Exception {
        return new JSONObject().put("id", id).put("habitId", "h1").put("dateKey", "2026-10-04").put("operation", operation).put("at", "2026-10-04T12:00:00.000Z");
    }
    @Test public void numericTargetRequiresEachIncrementAndCapsProgress() throws Exception {
        JSONObject snapshot = snapshot("numeric", 2), history = new JSONObject();
        assertTrue(HabitActionStore.apply(snapshot, action("a1", "increment"), history, true));
        assertEquals(1, HabitActionStore.entry(snapshot, "2026-10-04", "h1").getInt("value"));
        assertFalse(HabitActionStore.entry(snapshot, "2026-10-04", "h1").getBoolean("done"));
        assertTrue(HabitActionStore.apply(snapshot, action("a2", "increment"), history, true));
        assertTrue(HabitActionStore.entry(snapshot, "2026-10-04", "h1").getBoolean("done"));
        assertFalse(HabitActionStore.apply(snapshot, action("a3", "increment"), history, true));
        assertEquals(2, HabitActionStore.entry(snapshot, "2026-10-04", "h1").getInt("value"));
    }
    @Test public void undoSurvivesIntegerDoubleSerializationDuringAppSynchronization() throws Exception {
        JSONObject snapshot = snapshot("numeric", 2), history = new JSONObject();
        HabitActionStore.apply(snapshot, action("a1", "increment"), history, true);
        // JS JSON.stringify uses 1 where Android previously stored 1.0.
        HabitActionStore.entry(snapshot, "2026-10-04", "h1").put("value", 1);
        JSONObject undo = action("u1", "undo").put("referenceId", "a1");
        assertTrue(HabitActionStore.apply(snapshot, undo, history, true));
        assertNull(HabitActionStore.entry(snapshot, "2026-10-04", "h1"));
    }
    @Test public void undoCannotOverwriteANewerAppEdit() throws Exception {
        JSONObject snapshot = snapshot("binary", 1), history = new JSONObject();
        HabitActionStore.apply(snapshot, action("a1", "complete"), history, true);
        HabitActionStore.entry(snapshot, "2026-10-04", "h1").put("note", "Edited in app");
        assertFalse(HabitActionStore.apply(snapshot, action("u1", "undo").put("referenceId", "a1"), history, true));
        assertTrue(HabitActionStore.entry(snapshot, "2026-10-04", "h1").getBoolean("done"));
    }
    @Test public void widgetOptOutBlocksStaleWidgetActionsWithoutBlockingNotifications() throws Exception {
        JSONObject snapshot = snapshot("binary", 1);
        assertTrue(HabitActionStore.acceptsActionSource(snapshot, true));
        snapshot.put("widgetsEnabled", false);
        assertFalse(HabitActionStore.acceptsActionSource(snapshot, true));
        assertTrue(HabitActionStore.acceptsActionSource(snapshot, false));
        snapshot.put("widgetsEnabled", true);
        assertTrue(HabitActionStore.acceptsActionSource(snapshot, true));
    }
    @Test public void nativeScheduleMatchesMondayZeroCustomDays() throws Exception {
        JSONObject habit = new JSONObject().put("frequency", "custom").put("customDays", new JSONArray().put(0));
        assertTrue(HabitActionStore.scheduled(habit, LocalDate.parse("2026-10-05")));
        assertFalse(HabitActionStore.scheduled(habit, LocalDate.parse("2026-10-04")));
        habit.put("frequency", "weekdays");
        assertFalse(HabitActionStore.scheduled(habit, LocalDate.parse("2026-10-04")));
        assertTrue(HabitActionStore.scheduled(habit, LocalDate.parse("2026-10-09")));
    }
}
