package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.content.ComponentName;
import org.json.JSONObject;

public class GrainWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            // Capacitor Preferences writes to a SharedPreferences file named "CapacitorStorage"
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String widgetDataStr = prefs.getString("widget_data", "{}");

            JSONObject data = new JSONObject(widgetDataStr);
            int completed = data.optInt("completed", 0);
            int total = data.optInt("total", 0);
            int streak = data.optInt("streak", 0);

            // Construct the RemoteViews object
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.grain_widget);
            
            // Update UI
            views.setTextViewText(R.id.widget_progress, completed + "/" + total);
            
            if (streak > 0) {
                views.setTextViewText(R.id.widget_streak, streak + " Day Streak");
            } else {
                views.setTextViewText(R.id.widget_streak, "Let's begin");
            }

            // Instruct the widget manager to update the widget
            appWidgetManager.updateAppWidget(appWidgetId, views);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // You can call this from MainActivity or a service if you want to force an update
    public static void forceUpdate(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, GrainWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
