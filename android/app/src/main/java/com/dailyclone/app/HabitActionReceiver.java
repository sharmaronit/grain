package com.dailyclone.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class HabitActionReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        try {
            String operation = intent.getStringExtra("operation");
            if ("remind".equals(operation)) HabitReminders.deliver(context, intent);
            else if ("snooze".equals(operation)) HabitReminders.snooze(context, intent);
            else if ("complete".equals(operation) || "increment".equals(operation) || "undo".equals(operation)) {
                String id = HabitActionStore.perform(context, intent.getStringExtra("userId"), intent.getStringExtra("habitId"),
                        intent.getStringExtra("dateKey"), operation, intent.getStringExtra("referenceId"),
                        intent.getBooleanExtra("fromWidget", false) || (intent.getData() != null && "widget".equals(intent.getData().getHost())));
                if (id != null) {
                    HabitReminders.afterAction(context, intent.getStringExtra("habitId"), id, operation);
                    HabitActionsPlugin.changed();
                }
            }
            GrainWidget.forceUpdate(context);
            HabitReminders.reschedule(context);
        } catch (Exception e) { Log.e("GrainHabitActions", "Could not save action", e); }
    }
}
