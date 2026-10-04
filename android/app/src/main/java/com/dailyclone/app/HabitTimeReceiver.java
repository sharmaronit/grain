package com.dailyclone.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class HabitTimeReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_TIME_CHANGED.equals(action) && !Intent.ACTION_TIMEZONE_CHANGED.equals(action) && !Intent.ACTION_DATE_CHANGED.equals(action)) return;
        GrainWidget.forceUpdate(context);
        HabitReminders.reschedule(context);
    }
}
