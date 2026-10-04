package com.dailyclone.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;

public class HabitWidgetConfigureActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);
        int id = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }
        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        android.appwidget.AppWidgetProviderInfo info = manager.getAppWidgetInfo(id);
        boolean compact = info != null && info.provider.getClassName().equals(GrainCompactWidget.class.getName());
        boolean heatmap = info != null && info.provider.getClassName().equals(GrainHeatmapWidget.class.getName());
        boolean summary = heatmap || (info != null && info.provider.getClassName().equals(GrainProgressWidget.class.getName()));
        JSONObject snapshot = WidgetDesign.snapshot(this, id);
        int fg = HabitWidgetViews.foreground(snapshot);
        android.content.SharedPreferences prefs = getSharedPreferences("grain_widget_config", 0);
        Set<String> selected = new HashSet<>(prefs.getString("user_" + id, "").equals(snapshot.optString("userId")) ? prefs.getStringSet("ids_" + id, new HashSet<>()) : new HashSet<>());
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        int padding = (int) (24 * getResources().getDisplayMetrics().density);
        content.setPadding(padding, padding * 2, padding, padding);
        content.setBackgroundResource(WidgetDesign.background(snapshot));
        TextView title = new TextView(this);
        title.setText(summary ? "Widget design" : compact ? "One small action" : "Your daily checklist"); title.setTextColor(fg); title.setTextSize(26);
        content.addView(title);
        TextView subtitle = new TextView(this);
        subtitle.setText(summary ? "Choose a design for this widget." : compact ? "Choose one habit, or let Grain show your next pending habit." : "All pending habits appear by default. Choose specific habits below if you prefer.");
        subtitle.setTextColor(HabitWidgetViews.muted(snapshot)); subtitle.setTextSize(14); subtitle.setPadding(0, 12, 0, 20);
        content.addView(subtitle);
        String[] design = {WidgetDesign.of(snapshot)};
        android.widget.RadioGroup designs = new android.widget.RadioGroup(this);
        for (int index = 0; index < WidgetDesign.IDS.length; index++) {
            final String key = WidgetDesign.IDS[index];
            RadioButton option = new RadioButton(this);
            option.setButtonTintList(android.content.res.ColorStateList.valueOf(WidgetDesign.color(snapshot, "accent")));
            option.setId(View.generateViewId()); option.setText(WidgetDesign.LABELS[index]); option.setTextColor(fg);
            designs.addView(option); option.setChecked(key.equals(design[0]));
            option.setOnClickListener(v -> design[0] = key);
        }
        content.addView(designs);
        if (!summary) {
            java.util.List<android.widget.CompoundButton> buttons = new java.util.ArrayList<>();
            RadioButton automatic = new RadioButton(this);
            automatic.setText(compact ? "Next pending habit" : "All pending habits"); automatic.setTextColor(fg); automatic.setChecked(selected.isEmpty());
            content.addView(automatic);
            automatic.setOnClickListener(v -> { selected.clear(); for (android.widget.CompoundButton b : buttons) b.setChecked(false); automatic.setChecked(true); });
            JSONArray habits = snapshot.optJSONArray("habits");
            if (habits != null) for (int i = 0; i < habits.length(); i++) {
                JSONObject habit = habits.optJSONObject(i);
                if (habit == null) continue;
                String habitId = habit.optString("id");
                android.widget.CompoundButton button = compact ? new RadioButton(this) : new CheckBox(this);
                button.setText(habit.optString("name")); button.setTextColor(fg); button.setChecked(selected.contains(habitId));
                content.addView(button); buttons.add(button);
                button.setOnClickListener(v -> {
                    if (compact) { selected.clear(); for (android.widget.CompoundButton b : buttons) if (b != button) b.setChecked(false); button.setChecked(true); }
                    if (button.isChecked()) selected.add(habitId); else selected.remove(habitId);
                    automatic.setChecked(selected.isEmpty());
                });
            }
        }
        Button save = new Button(this); save.setText("Save widget"); content.addView(save);
        save.setOnClickListener(v -> {
            prefs.edit().putString("design_" + id, design[0]).putStringSet("ids_" + id, selected).putString("user_" + id, snapshot.optString("userId")).apply();
            if (summary) HabitSummaryWidgetViews.update(this, manager, id, heatmap);
            else HabitWidgetViews.update(this, manager, id, compact);
            HabitReminders.reschedule(this);
            setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)); finish();
        });
        scroll.addView(content); setContentView(scroll);
        scroll.setOnApplyWindowInsetsListener((v, insets) -> {
            content.setPadding(padding, padding + insets.getSystemWindowInsetTop(), padding, padding + insets.getSystemWindowInsetBottom());
            return insets;
        });
    }
}
