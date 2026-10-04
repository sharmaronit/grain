package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

public class GrainProgressWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) HabitSummaryWidgetViews.update(context, manager, id, false);
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        HabitSummaryWidgetViews.update(context, manager, id, false);
    }
    @Override public void onDeleted(Context context, int[] ids) { WidgetDesign.delete(context, ids); }
}
