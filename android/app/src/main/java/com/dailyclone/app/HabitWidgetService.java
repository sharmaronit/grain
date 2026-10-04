package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import org.json.JSONObject;
import java.util.Collections;
import java.util.List;

/** Collection adapter for Android 7–11; newer versions use RemoteCollectionItems. */
public class HabitWidgetService extends RemoteViewsService {
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1);
        return new RemoteViewsFactory() {
            JSONObject snapshot = new JSONObject();
            List<JSONObject> habits = Collections.emptyList();
            @Override public void onCreate() { onDataSetChanged(); }
            @Override public void onDataSetChanged() {
                snapshot = HabitActionStore.snapshot(HabitWidgetService.this);
                habits = HabitWidgetViews.habits(HabitWidgetService.this, snapshot, id, false);
            }
            @Override public void onDestroy() {}
            @Override public int getCount() { return habits.size(); }
            @Override public RemoteViews getViewAt(int position) {
                return position >= 0 && position < habits.size() ? HabitWidgetViews.row(HabitWidgetService.this, snapshot, habits.get(position), false) : null;
            }
            @Override public RemoteViews getLoadingView() { return null; }
            @Override public int getViewTypeCount() { return 1; }
            @Override public long getItemId(int position) { return position; }
            @Override public boolean hasStableIds() { return false; }
        };
    }
}
