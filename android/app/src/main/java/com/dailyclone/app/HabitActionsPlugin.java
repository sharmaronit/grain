package com.dailyclone.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name = "HabitActions")
public class HabitActionsPlugin extends Plugin {
    static final String EXTRA_CREATE_HABIT = "grain_open_create_habit";
    static final String EXTRA_WIDGET_USER = "grain_widget_user";
    private static WeakReference<HabitActionsPlugin> live = new WeakReference<>(null);
    @Override public void load() { live = new WeakReference<>(this); }
    @Override protected void handleOnDestroy() {
        if (live.get() == this) live.clear();
    }
    static void changed() {
        HabitActionsPlugin plugin = live.get();
        if (plugin != null) plugin.notifyListeners("changed", new JSObject());
    }
    static void createHabitRequested() {
        HabitActionsPlugin plugin = live.get();
        if (plugin != null) plugin.notifyListeners("createHabitRequested", new JSObject());
    }
    @PluginMethod public void consumeCreateHabitRequest(PluginCall call) {
        Intent intent = getActivity().getIntent();
        JSObject result = new JSObject();
        boolean open = intent != null && intent.getBooleanExtra(EXTRA_CREATE_HABIT, false);
        result.put("open", open);
        result.put("userId", open ? intent.getStringExtra(EXTRA_WIDGET_USER) : "");
        if (open) {
            intent.removeExtra(EXTRA_CREATE_HABIT);
            intent.removeExtra(EXTRA_WIDGET_USER);
        }
        call.resolve(result);
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
        String kind = call.getString("kind", call.getBoolean("compact", false) ? "compact" : "checklist");
        Class<?> provider;
        switch (kind) {
            case "compact": provider = GrainCompactWidget.class; break;
            case "heatmap": provider = GrainHeatmapWidget.class; break;
            case "progress": provider = GrainProgressWidget.class; break;
            case "checklist": provider = GrainWidget.class; break;
            default: call.reject("Unknown widget type"); return;
        }
        String requestedDesign = call.getString("design", "classic");
        String design = WidgetDesign.normalize(requestedDesign);
        if (!design.equals(requestedDesign)) { call.reject("Unknown widget design"); return; }
        if (supported) {
            Intent callback = new Intent(getContext(), WidgetPinnedReceiver.class)
                .setData(android.net.Uri.parse("grain://widget-pin/" + java.util.UUID.randomUUID() + "?design=" + design));
            int flags = android.app.PendingIntent.FLAG_ONE_SHOT;
            // The launcher fills in EXTRA_APPWIDGET_ID after the user accepts.
            if (android.os.Build.VERSION.SDK_INT >= 31) flags |= android.app.PendingIntent.FLAG_MUTABLE;
            android.app.PendingIntent success = android.app.PendingIntent.getBroadcast(getContext(), 0, callback, flags);
            supported = manager.requestPinAppWidget(new ComponentName(getContext(), provider), null, success);
            if (!supported) success.cancel();
        }
        JSObject result = new JSObject(); result.put("supported", supported); call.resolve(result);
    }
    @PluginMethod public void testReminder(PluginCall call) {
        JSObject result = new JSObject(); result.put("shown", HabitReminders.test(getContext())); call.resolve(result);
    }
}
