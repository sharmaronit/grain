package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

public class GrainCompactWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) HabitWidgetViews.update(context, manager, id, true);
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        HabitWidgetViews.update(context, manager, id, true);
    }
    @Override public void onDeleted(Context context, int[] ids) {
        WidgetDesign.delete(context, ids);
    }
}
