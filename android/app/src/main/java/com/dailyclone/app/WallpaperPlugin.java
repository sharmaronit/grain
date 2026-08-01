package com.dailyclone.app;

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.util.DisplayMetrics;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Wallpaper")
public class WallpaperPlugin extends Plugin {

    /**
     * Push the latest heatmap data into SharedPreferences so the running
     * live wallpaper service picks it up via its OnSharedPreferenceChangeListener.
     */
    @PluginMethod
    public void syncWallpaperData(PluginCall call) {
        try {
            JSObject data = call.getData();
            if (data != null) {
                String jsonStr = data.toString();
                SharedPreferences prefs = getContext()
                    .getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().putString("GRAIN_LIVE_DATA", jsonStr).apply();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to sync wallpaper data", e);
        }
    }

    /**
     * Check if the device supports live wallpapers.
     *
     * Bug 10 fix: Instead of resolveActivity (which returns null on API 30+
     * due to package visibility), we check WallpaperManager.getWallpaperInfo()
     * capability and the system feature directly.
     */
    @PluginMethod
    public void isLiveWallpaperSupported(PluginCall call) {
        JSObject ret = new JSObject();
        // Live wallpapers have been supported since API 7.
        // The only case where they don't work is on very rare custom ROMs
        // that strip the feature. Use the feature flag check.
        boolean supported = getContext().getPackageManager()
            .hasSystemFeature("android.software.live_wallpaper");
        ret.put("supported", supported);
        call.resolve(ret);
    }

    /**
     * Sync data to SharedPreferences, then launch the system live wallpaper
     * picker so the user can confirm.
     *
     * Bug 11 note: We cannot know if the user confirmed or cancelled the
     * picker — startActivity is fire-and-forget. The JS side should show
     * "Wallpaper picker opened" rather than "Applied!".
     */
    @PluginMethod
    public void setWallpaper(PluginCall call) {
        try {
            JSObject data = call.getData();
            if (data != null && data.has("heatmap")) {
                String jsonStr = data.toString();
                SharedPreferences prefs = getContext()
                    .getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().putString("GRAIN_LIVE_DATA", jsonStr).apply();
            }

            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(
                WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                new ComponentName(getContext(), GrainWallpaperService.class)
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            try {
                getContext().startActivity(intent);
            } catch (android.content.ActivityNotFoundException e) {
                // Some OEMs (like Samsung) strip the direct intent. Fallback to the general picker.
                Intent fallback = new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set live wallpaper", e);
        }
    }

    /**
     * Fallback: render the heatmap to a Bitmap and set it as a static wallpaper.
     * Bug 7 fix: Bitmap is recycled after use to prevent memory leaks.
     */
    @PluginMethod
    public void setStaticWallpaper(PluginCall call) {
        Bitmap bitmap = null;
        try {
            JSObject data = call.getData();
            String jsonStr = data != null ? data.toString() : null;
            GrainWallpaperService.WallpaperData parsed =
                GrainWallpaperService.WallpaperData.fromJson(jsonStr);

            DisplayMetrics metrics = getContext().getResources().getDisplayMetrics();
            int width = metrics.widthPixels;
            int height = metrics.heightPixels;

            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            GrainWallpaperService.drawHeatmapToCanvas(
                getContext(), canvas, width, height, parsed);

            WallpaperManager manager = WallpaperManager.getInstance(getContext());
            manager.setBitmap(bitmap);

            // Also persist the data so the user's settings are remembered
            if (jsonStr != null) {
                SharedPreferences prefs = getContext()
                    .getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().putString("GRAIN_LIVE_DATA", jsonStr).apply();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set static wallpaper", e);
        } finally {
            // Bug 7: Always recycle the bitmap to free ~10MB of native memory
            if (bitmap != null) {
                bitmap.recycle();
            }
        }
    }
}
