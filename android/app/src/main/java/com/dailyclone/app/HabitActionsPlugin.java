package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name = "HabitActions")
public class HabitActionsPlugin extends Plugin {
    private static WeakReference<HabitActionsPlugin> live = new WeakReference<>(null);
    @Override public void load() { live = new WeakReference<>(this); }
    @Override protected void handleOnDestroy() {
        if (live.get() == this) live.clear();
    }
    static void changed() {
        HabitActionsPlugin plugin = live.get();
        if (plugin != null) plugin.notifyListeners("changed", new JSObject());
    }
    @PluginMethod public void getPending(PluginCall call) {
        try { JSObject result = new JSObject(); result.put("actions", HabitActionStore.pending(getContext())); call.resolve(result); }
        catch (Exception e) { call.reject("Could not read pending completions", e); }
    }
    @PluginMethod public void synchronize(PluginCall call) {
        try {
            JSObject snapshot = call.getObject("snapshot");
            if (snapshot == null) { call.reject("Missing snapshot"); return; }
            HabitActionStore.synchronize(getContext(), snapshot, call.getArray("ackIds", new JSArray()));
            GrainWidget.forceUpdate(getContext());
            HabitReminders.reschedule(getContext());
            call.resolve();
        } catch (Exception e) { call.reject("Could not synchronize habit actions", e); }
    }
    @PluginMethod public void pinWidget(PluginCall call) {
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        boolean supported = android.os.Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported();
        if (supported) manager.requestPinAppWidget(new ComponentName(getContext(), call.getBoolean("compact", false) ? GrainCompactWidget.class : GrainWidget.class), null, null);
        JSObject result = new JSObject(); result.put("supported", supported); call.resolve(result);
    }
    @PluginMethod public void testReminder(PluginCall call) {
        JSObject result = new JSObject(); result.put("shown", HabitReminders.test(getContext())); call.resolve(result);
    }
}
