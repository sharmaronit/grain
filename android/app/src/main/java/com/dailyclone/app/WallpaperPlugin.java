package com.dailyclone.app;

import android.app.WallpaperManager;
import android.app.Activity;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.os.Build;
import android.provider.Settings;
import android.net.Uri;

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
    private volatile boolean livePickerPending;

    private SharedPreferences wallpaperPrefs() {
        return getContext().getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
    }
    private void clearPreview() {
        String staged = wallpaperPrefs().getString(GrainWallpaperService.KEY_PREVIEW_PHOTO, null);
        if (staged != null && !staged.equals(wallpaperPrefs().getString(GrainWallpaperService.KEY_PHOTO_PATH, null)))
            discardStagedPhoto(staged);
        wallpaperPrefs().edit().remove(GrainWallpaperService.KEY_PREVIEW_DATA).remove(GrainWallpaperService.KEY_PREVIEW_PHOTO).apply();
    }
    private void discardStagedPhoto(String path) {
        try {
            File file = new File(path).getCanonicalFile();
            if (getContext().getFilesDir().getCanonicalFile().equals(file.getParentFile())
                && file.getName().startsWith("grain_wallpaper_preview_")) file.delete();
        } catch (Exception ignored) {}
    }
    private void commitPreview(String json, boolean live) {
        SharedPreferences prefs = wallpaperPrefs();
        String previousPhoto = prefs.getString(GrainWallpaperService.KEY_PHOTO_PATH, null);
        SharedPreferences.Editor edit = prefs.edit().putString(GrainWallpaperService.KEY_LIVE_DATA, json)
            .putBoolean("GRAIN_IS_STATIC_FALLBACK", !live);
        String photo = prefs.getString(GrainWallpaperService.KEY_PREVIEW_PHOTO, null);
        if (photo != null) edit.putString(GrainWallpaperService.KEY_PHOTO_PATH, photo);
        edit.remove(GrainWallpaperService.KEY_PREVIEW_DATA).remove(GrainWallpaperService.KEY_PREVIEW_PHOTO).apply();
        if (photo != null && previousPhoto != null && !photo.equals(previousPhoto)) discardStagedPhoto(previousPhoto);
    }

    // ── syncWallpaperData ────────────────────────────────────────────────
    // Saves GRAIN_LIVE_DATA to SharedPreferences.
    // If a customPhotoBase64 is present, saves the photo to disk separately
    // so the large base64 never ends up in GRAIN_LIVE_DATA.

    @PluginMethod
    public void updateWidget(PluginCall call) {
        GrainWidget.forceUpdate(getContext());
        call.resolve();
    }

    @PluginMethod
    public void syncWallpaperData(PluginCall call) {
        if (livePickerPending) {
            JSObject result = new JSObject(); result.put("success", false); call.resolve(result); return;
        }
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
                        if (!livePickerPending && prefs.getBoolean("GRAIN_IS_STATIC_FALLBACK", false))
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
        if (livePickerPending) { call.reject("A wallpaper picker is already open"); return; }
        if (getActivity() == null) { call.reject("No foreground activity"); return; }
        try {
            JSObject data = call.getData();
            if (data == null || !data.has("heatmap")) { call.reject("Missing wallpaper data"); return; }
            if (scheduledStaticUpdate != null) scheduledStaticUpdate.cancel(false);
            clearPreview();
            String json = savePhotoAndSanitizeJson(data, true);
            wallpaperPrefs().edit().putString(GrainWallpaperService.KEY_PREVIEW_DATA, json).apply();
            livePickerPending = true;
            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                new ComponentName(getContext(), GrainWallpaperService.class));
            try {
                startActivityForResult(call, intent, "wallpaperSelected");
            } catch (android.content.ActivityNotFoundException e) {
                startActivityForResult(call, new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER), "wallpaperSelected");
            }
        } catch (Exception e) {
            livePickerPending = false;
            clearPreview();
            call.reject("Failed to open live wallpaper picker", e);
        }
    }

    @ActivityCallback
    private void wallpaperSelected(PluginCall call, ActivityResult result) {
        livePickerPending = false;
        try {
            WallpaperManager manager = WallpaperManager.getInstance(getContext());
            ComponentName grain = new ComponentName(getContext(), GrainWallpaperService.class);
            android.app.WallpaperInfo home = manager.getWallpaperInfo();
            android.app.WallpaperInfo lock = Build.VERSION.SDK_INT >= 34 ? manager.getWallpaperInfo(WallpaperManager.FLAG_LOCK) : null;
            boolean isGrain = (home != null && grain.equals(home.getComponent())) || (lock != null && grain.equals(lock.getComponent()));
            boolean applied = result.getResultCode() == Activity.RESULT_OK && isGrain;
            String json = wallpaperPrefs().getString(GrainWallpaperService.KEY_PREVIEW_DATA, null);
            if (applied && json != null) commitPreview(json, true);
            else { applied = false; clearPreview(); }
            if (call != null) {
                JSObject response = new JSObject(); response.put("success", applied); call.resolve(response);
            }
        } catch (Exception e) {
            clearPreview();
            if (call != null) call.reject("Could not confirm the live wallpaper", e);
        }
    }

    // ── setStaticWallpaper ───────────────────────────────────────────────

    @PluginMethod
    public void setStaticWallpaper(PluginCall call) {
        if (livePickerPending) { call.reject("Close the live wallpaper picker first"); return; }
        Bitmap bitmap = null;
        try {
            if (!WallpaperManager.getInstance(getContext()).isSetWallpaperAllowed()) {
                call.reject("Static wallpaper changes are not allowed on this device"); return;
            }
            if (scheduledStaticUpdate != null) scheduledStaticUpdate.cancel(false);
            JSObject data = call.getData();
            clearPreview();
            String jsonStr = savePhotoAndSanitizeJson(data, true);

            GrainWallpaperService.WallpaperData parsed =
                GrainWallpaperService.WallpaperData.fromJson(jsonStr);
            parsed.photoPathOverride = wallpaperPrefs().getString(GrainWallpaperService.KEY_PREVIEW_PHOTO, null);

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

            int wallpaperId = WallpaperManager.getInstance(getContext()).setBitmap(
                bitmap,
                null,
                true,
                flags
            );
            if (wallpaperId <= 0) throw new IllegalStateException("Static wallpaper was not applied");

            // Persist so future auto-updates work
            SharedPreferences prefs = getContext()
                .getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("GRAIN_STATIC_SCREEN_TARGET", screenTarget).apply();
            commitPreview(jsonStr, false);

            WallpaperWorker.scheduleNextUpdate(getContext());

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set static wallpaper", e);
        } finally {
            clearPreview();
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

    /** Returns whether Android will permit the precise midnight refresh alarm. */
    @PluginMethod
    public void isExactAlarmAllowed(PluginCall call) {
        JSObject ret = new JSObject();
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
        boolean allowed = !supported || ((android.app.AlarmManager) getContext()
                .getSystemService(Context.ALARM_SERVICE)).canScheduleExactAlarms();
        ret.put("supported", supported);
        ret.put("allowed", allowed);
        call.resolve(ret);
    }

    /** Opens Android's system-controlled Exact Alarms permission page. */
    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getContext().startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Unable to open Exact Alarms settings", e);
        }
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
        return savePhotoAndSanitizeJson(data, false);
    }
    private String savePhotoAndSanitizeJson(JSObject data, boolean preview) {
        if (data == null) return "{}";
        try {
            String b64 = data.optString("customPhotoBase64", null);
            if (b64 != null && !b64.isEmpty()) {
                // Strip data-URL prefix if present
                if (b64.contains(",")) b64 = b64.substring(b64.indexOf(",") + 1);

                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                File photoFile = new File(getContext().getFilesDir(), preview ? "grain_wallpaper_preview_" + java.util.UUID.randomUUID() + ".jpg" : "grain_wallpaper_photo.jpg");
                
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
                     .putString(preview ? GrainWallpaperService.KEY_PREVIEW_PHOTO : GrainWallpaperService.KEY_PHOTO_PATH, photoFile.getAbsolutePath())
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
