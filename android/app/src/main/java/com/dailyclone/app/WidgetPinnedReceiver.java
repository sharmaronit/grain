package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Each pin request carries its own design, so pending requests cannot overwrite each other. */
public class WidgetPinnedReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getData() == null) return;
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        AppWidgetProviderInfo info = AppWidgetManager.getInstance(context).getAppWidgetInfo(id);
        if (info == null || !context.getPackageName().equals(info.provider.getPackageName())) return;
        String design = WidgetDesign.normalize(intent.getData().getQueryParameter("design"));
        context.getSharedPreferences("grain_widget_config", 0).edit().putString("design_" + id, design).apply();
        GrainWidget.forceUpdate(context);
    }
}
