package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.ComponentName;
import android.os.Bundle;

public class GrainWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        HabitWidgetViews.update(context, appWidgetManager, appWidgetId, false);
    }

    // You can call this from MainActivity or a service if you want to force an update
    public static void forceUpdate(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, GrainWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        for (int id : appWidgetManager.getAppWidgetIds(new ComponentName(context, GrainCompactWidget.class)))
            HabitWidgetViews.update(context, appWidgetManager, id, true);
        for (int id : appWidgetManager.getAppWidgetIds(new ComponentName(context, GrainHeatmapWidget.class)))
            HabitSummaryWidgetViews.update(context, appWidgetManager, id, true);
        for (int id : appWidgetManager.getAppWidgetIds(new ComponentName(context, GrainProgressWidget.class)))
            HabitSummaryWidgetViews.update(context, appWidgetManager, id, false);
    }

    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        updateAppWidget(context, manager, id);
    }

    @Override public void onDeleted(Context context, int[] ids) {
        WidgetDesign.delete(context, ids);
    }
}
