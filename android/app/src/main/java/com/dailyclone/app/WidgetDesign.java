package com.dailyclone.app;

import android.content.Context;
import android.graphics.Color;
import org.json.JSONObject;

/** Visual preferences belong to each widget, independently of the habit account. */
final class WidgetDesign {
    static final String[] IDS = {"classic", "paper", "oled", "botanical", "dots"};
    static final String[] LABELS = {"Follow app theme", "Paper", "OLED Minimal", "Botanical", "Dot Matrix"};
    static String normalize(String value) {
        for (String id : IDS) if (id.equals(value)) return id;
        return "classic";
    }
    static String of(JSONObject snapshot) { return normalize(snapshot.optString("widgetDesign")); }
    static JSONObject snapshot(Context context, int id) {
        JSONObject result = HabitActionStore.snapshot(context);
        try { result.put("widgetDesign", normalize(context.getSharedPreferences("grain_widget_config", 0).getString("design_" + id, "classic"))); }
        catch (org.json.JSONException e) { throw new IllegalStateException(e); }
        return result;
    }
    static boolean light(JSONObject s) {
        String d = of(s);
        return d.equals("paper") || d.equals("botanical") || (d.equals("classic") && "light".equals(s.optString("theme")));
    }
    static int color(JSONObject s, String role) {
        String d = of(s);
        String[] colors;
        switch (d) {
            case "paper": colors = new String[]{"#302C26", "#756C5B", "#947344", "#E5DDCD"}; break;
            case "botanical": colors = new String[]{"#213D2B", "#5D725A", "#39734B", "#D4DFCA"}; break;
            case "dots": colors = new String[]{"#E9F2EF", "#A5B7AE", "#A8EDBC", "#283B33"}; break;
            case "oled": colors = new String[]{"#F4F4F5", "#A1A1AA", "#C4B5FD", "#232127"}; break;
            default: colors = light(s) ? new String[]{"#151517", "#66666E", "#047857", "#DDE3E0"}
                : new String[]{"#F4F4F5", "#A1A1AA", "#34D399", "#27272A"};
        }
        return Color.parseColor(colors[role.equals("ink") ? 0 : role.equals("muted") ? 1 : role.equals("accent") ? 2 : 3]);
    }
    static int background(JSONObject s) {
        switch (of(s)) {
            case "paper": return R.drawable.widget_surface_paper;
            case "botanical": return R.drawable.widget_surface_botanical;
            case "dots": return R.drawable.widget_surface_dots;
            case "oled": return R.drawable.widget_surface_amoled;
            default: return light(s) ? R.drawable.widget_surface_light : "amoled".equals(s.optString("theme")) ? R.drawable.widget_surface_amoled : R.drawable.widget_surface_dark;
        }
    }
    static int button(JSONObject s) {
        switch (of(s)) {
            case "paper": return R.drawable.widget_button_paper;
            case "botanical": return R.drawable.widget_button_botanical;
            case "dots": return R.drawable.widget_button_dots;
            case "oled": return R.drawable.widget_button_oled;
            default: return light(s) ? R.drawable.widget_button_light : R.drawable.widget_button_dark;
        }
    }
    static void delete(Context context, int[] ids) {
        android.content.SharedPreferences.Editor edit = context.getSharedPreferences("grain_widget_config", 0).edit();
        for (int id : ids) edit.remove("design_" + id).remove("ids_" + id).remove("user_" + id);
        edit.apply();
    }
}
