package com.dailyclone.app;

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.util.Base64;
import android.util.DisplayMetrics;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "Wallpaper")
public class WallpaperPlugin extends Plugin {

    private final ScheduledExecutorService debounceExecutor = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> scheduledStaticUpdate;

    // ── syncWallpaperData ────────────────────────────────────────────────
    // Saves GRAIN_LIVE_DATA to SharedPreferences.
    // If a customPhotoBase64 is present, saves the photo to disk separately
    // so the large base64 never ends up in GRAIN_LIVE_DATA.

    @PluginMethod
    public void syncWallpaperData(PluginCall call) {
        try {
            JSObject data = call.getData();
            if (data != null) {
                // Extract & save custom photo separately, then strip from JSON
                String jsonStr = savePhotoAndSanitizeJson(data);

                SharedPreferences prefs = getContext()
                    .getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString(GrainWallpaperService.KEY_LIVE_DATA, jsonStr).apply();
                
                // If using Static Wallpaper, sync it in the background!
                if (prefs.getBoolean("GRAIN_IS_STATIC_FALLBACK", false)) {
                    if (scheduledStaticUpdate != null) {
                        scheduledStaticUpdate.cancel(false);
                    }
                    scheduledStaticUpdate = debounceExecutor.schedule(() -> {
                        updateStaticWallpaperSilently(prefs, jsonStr);
                    }, 1000, TimeUnit.MILLISECONDS);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to sync wallpaper data", e);
        }
    }

    private void updateStaticWallpaperSilently(SharedPreferences prefs, String jsonStr) {
        Bitmap bitmap = null;
        try {
            GrainWallpaperService.WallpaperData parsed =
                GrainWallpaperService.WallpaperData.fromJson(jsonStr);

            DisplayMetrics metrics = getContext().getResources().getDisplayMetrics();
            int width  = metrics.widthPixels;
            int height = metrics.heightPixels;

            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            GrainWallpaperService.drawHeatmapToCanvas(getContext(), canvas, width, height, parsed);

            String screenTarget = prefs.getString("GRAIN_STATIC_SCREEN_TARGET", "both");
            int flags = android.app.WallpaperManager.FLAG_SYSTEM | android.app.WallpaperManager.FLAG_LOCK;
            if ("home".equals(screenTarget)) {
                flags = android.app.WallpaperManager.FLAG_SYSTEM;
            } else if ("lock".equals(screenTarget)) {
                flags = android.app.WallpaperManager.FLAG_LOCK;
            }

            android.app.WallpaperManager.getInstance(getContext()).setBitmap(bitmap, null, true, flags);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (bitmap != null) bitmap.recycle();
        }
    }

    // ── setWallpaper (live) ──────────────────────────────────────────────

    @PluginMethod
    public void setWallpaper(PluginCall call) {
        try {
            JSObject data = call.getData();
            if (data != null && data.has("heatmap")) {
                String jsonStr = savePhotoAndSanitizeJson(data);
                SharedPreferences prefs = getContext()
                    .getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit()
                     .putString(GrainWallpaperService.KEY_LIVE_DATA, jsonStr)
                     .putBoolean("GRAIN_IS_STATIC_FALLBACK", false)
                     .apply();
            }

            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                            new ComponentName(getContext(), GrainWallpaperService.class));

            android.app.Activity activity = getActivity();
            if (activity == null) { call.reject("No foreground activity"); return; }

            try {
                activity.startActivity(intent);
            } catch (android.content.ActivityNotFoundException e) {
                activity.startActivity(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER));
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set live wallpaper", e);
        }
    }

    // ── setStaticWallpaper ───────────────────────────────────────────────

    @PluginMethod
    public void setStaticWallpaper(PluginCall call) {
        Bitmap bitmap = null;
        try {
            JSObject data = call.getData();
            String jsonStr = savePhotoAndSanitizeJson(data);

            GrainWallpaperService.WallpaperData parsed =
                GrainWallpaperService.WallpaperData.fromJson(jsonStr);

            DisplayMetrics metrics = getContext().getResources().getDisplayMetrics();
            int width  = metrics.widthPixels;
            int height = metrics.heightPixels;

            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            GrainWallpaperService.drawHeatmapToCanvas(getContext(), canvas, width, height, parsed);

            String screenTarget = data.optString("screenTarget", "both");
            int flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
            if ("home".equals(screenTarget)) {
                flags = WallpaperManager.FLAG_SYSTEM;
            } else if ("lock".equals(screenTarget)) {
                flags = WallpaperManager.FLAG_LOCK;
            }

            WallpaperManager.getInstance(getContext()).setBitmap(
                bitmap,
                null,
                true,
                flags
            );

            // Persist so future auto-updates work
            SharedPreferences prefs = getContext()
                .getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                 .putString(GrainWallpaperService.KEY_LIVE_DATA, jsonStr)
                 .putString("GRAIN_STATIC_SCREEN_TARGET", screenTarget)
                 .putBoolean("GRAIN_IS_STATIC_FALLBACK", true)
                 .apply();

            WallpaperWorker.scheduleNextUpdate(getContext());

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set static wallpaper", e);
        } finally {
            if (bitmap != null) bitmap.recycle();
        }
    }

    // ── isLiveWallpaperSupported ─────────────────────────────────────────

    @PluginMethod
    public void isLiveWallpaperSupported(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported",
            getContext().getPackageManager()
                .hasSystemFeature("android.software.live_wallpaper"));
        call.resolve(ret);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * If the call data contains a "customPhotoBase64" field:
     *   1. Decode the JPEG and save it to the app's private files dir.
     *   2. Store the absolute path in SharedPreferences (KEY_PHOTO_PATH).
     *   3. Remove "customPhotoBase64" from the JSON so we never write huge
     *      base64 strings to SharedPreferences.
     *
     * Returns the sanitised JSON string ready to be stored in GRAIN_LIVE_DATA.
     */
    private String savePhotoAndSanitizeJson(JSObject data) {
        if (data == null) return "{}";
        try {
            String b64 = data.optString("customPhotoBase64", null);
            if (b64 != null && !b64.isEmpty()) {
                // Strip data-URL prefix if present
                if (b64.contains(",")) b64 = b64.substring(b64.indexOf(",") + 1);

                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                File photoFile = new File(getContext().getFilesDir(), "grain_wallpaper_photo.jpg");
                
                // Downsample & write clean JPEG to avoid storing massive raw bitmaps on disk
                BitmapFactory.Options opts = new BitmapFactory.Options();
                opts.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opts);

                int inSampleSize = 1;
                while ((opts.outHeight / inSampleSize) > 1920 || (opts.outWidth / inSampleSize) > 1080) {
                    inSampleSize *= 2;
                }
                opts.inSampleSize = Math.max(1, inSampleSize);
                opts.inJustDecodeBounds = false;
                opts.inPreferredConfig = Bitmap.Config.RGB_565;

                Bitmap decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opts);
                if (decoded != null) {
                    FileOutputStream fos = new FileOutputStream(photoFile);
                    decoded.compress(Bitmap.CompressFormat.JPEG, 85, fos);
                    fos.flush();
                    fos.close();
                    decoded.recycle();
                } else {
                    FileOutputStream fos = new FileOutputStream(photoFile);
                    fos.write(bytes);
                    fos.close();
                }

                // Store the path so GrainWallpaperService can read it
                SharedPreferences prefs = getContext()
                    .getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit()
                     .putString(GrainWallpaperService.KEY_PHOTO_PATH, photoFile.getAbsolutePath())
                     .apply();
            }
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            // Always remove the base64 blob before writing to GRAIN_LIVE_DATA
            data.remove("customPhotoBase64");
        }
        return data.toString();
    }

    private void updateStaticWallpaperBackground(String jsonStr) {
        Bitmap bitmap = null;
        try {
            GrainWallpaperService.WallpaperData parsed =
                GrainWallpaperService.WallpaperData.fromJson(jsonStr);
            DisplayMetrics metrics = getContext().getResources().getDisplayMetrics();
            bitmap = Bitmap.createBitmap(metrics.widthPixels, metrics.heightPixels,
                                         Bitmap.Config.RGB_565);
            Canvas canvas = new Canvas(bitmap);
            GrainWallpaperService.drawHeatmapToCanvas(
                getContext(), canvas, metrics.widthPixels, metrics.heightPixels, parsed);

            SharedPreferences prefs = getContext()
                .getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
            String screenTarget = prefs.getString("GRAIN_STATIC_SCREEN_TARGET", "both");
            int flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
            if ("home".equals(screenTarget)) {
                flags = WallpaperManager.FLAG_SYSTEM;
            } else if ("lock".equals(screenTarget)) {
                flags = WallpaperManager.FLAG_LOCK;
            }

            WallpaperManager.getInstance(getContext()).setBitmap(
                bitmap,
                null,
                true,
                flags
            );
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            if (bitmap != null) bitmap.recycle();
        }
    }
}

