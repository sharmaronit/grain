package com.dailyclone.app;

import org.junit.Test;
import org.json.JSONObject;
import java.time.LocalDate;
import static org.junit.Assert.assertArrayEquals;

public class HabitSummaryWidgetViewsTest {
    @Test public void countsScheduledCompletionsWithoutCountingSkips() throws Exception {
        JSONObject snapshot = new JSONObject("{\"habits\":[{\"id\":\"a\"},{\"id\":\"b\"},{\"id\":\"c\",\"frequency\":\"weekdays\"}],\"completions\":{\"2026-10-04\":{\"a\":{\"done\":true},\"b\":{\"skipped\":true},\"c\":{\"done\":true}}}}");
        assertArrayEquals(new int[]{1, 2}, HabitSummaryWidgetViews.counts(snapshot, LocalDate.of(2026, 10, 4)));
    }
    @Test public void noScheduledHabitsHasZeroDenominator() throws Exception {
        JSONObject snapshot = new JSONObject("{\"habits\":[{\"id\":\"a\",\"frequency\":\"custom\",\"customDays\":[0]}]}");
        assertArrayEquals(new int[]{0, 0}, HabitSummaryWidgetViews.counts(snapshot, LocalDate.of(2026, 10, 4)));
    }
    @Test public void newlyCreatedHabitsDoNotLowerPastCompletion() throws Exception {
        JSONObject snapshot = new JSONObject("{\"habits\":[{\"id\":\"a\",\"createdAt\":\"2026-10-04T12:00:00Z\"},{\"id\":\"b\"}],\"completions\":{\"2026-10-01\":{\"b\":{\"done\":true}}}}");
        assertArrayEquals(new int[]{1, 1}, HabitSummaryWidgetViews.counts(snapshot, LocalDate.of(2026, 10, 1)));
    }
}
