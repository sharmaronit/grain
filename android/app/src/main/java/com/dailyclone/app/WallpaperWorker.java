package com.dailyclone.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.app.WallpaperManager;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.Calendar;
import java.util.concurrent.TimeUnit;

public class WallpaperWorker extends Worker {

    private static final String TAG = "WallpaperWorker";
    private static final String WORK_NAME = "GrainWallpaperDailyRefresh";
    static final String ACTION_DAILY_REFRESH = "com.dailyclone.app.WALLPAPER_DAILY_REFRESH";

    public WallpaperWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Running midnight wallpaper update...");
        Context context = getApplicationContext();

        SharedPreferences prefs = context.getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
        boolean isStatic = prefs.getBoolean("GRAIN_IS_STATIC_FALLBACK", false);
        String jsonStr = prefs.getString(GrainWallpaperService.KEY_LIVE_DATA, null);

        boolean updateSuccess = !isStatic || jsonStr == null || updateStaticWallpaper(context, prefs, jsonStr);

        if (!updateSuccess && getRunAttemptCount() < 3) {
            Log.w(TAG, "Wallpaper update failed, retrying attempt #" + getRunAttemptCount());
            return Result.retry();
        }

        // Only schedule after a successful (or intentionally skipped) run. Scheduling from
        // finally used ExistingWorkPolicy.REPLACE and cancelled WorkManager's own retry.
        scheduleNextUpdate(context);
        return Result.success();
    }

    /** Shared by the exact-alarm receiver and WorkManager fallback. */
    static boolean updateStaticWallpaper(Context context, SharedPreferences prefs, String jsonStr) {
        Bitmap bitmap = null;
        try {
            GrainWallpaperService.WallpaperData parsed =
                    GrainWallpaperService.WallpaperData.fromJson(jsonStr);
            DisplayMetrics metrics = context.getResources().getDisplayMetrics();
            bitmap = Bitmap.createBitmap(metrics.widthPixels, metrics.heightPixels, Bitmap.Config.ARGB_8888);
            GrainWallpaperService.drawHeatmapToCanvas(context, new Canvas(bitmap),
                    metrics.widthPixels, metrics.heightPixels, parsed);

            String screenTarget = prefs.getString("GRAIN_STATIC_SCREEN_TARGET", "both");
            int flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
            if ("home".equals(screenTarget)) flags = WallpaperManager.FLAG_SYSTEM;
            else if ("lock".equals(screenTarget)) flags = WallpaperManager.FLAG_LOCK;
            WallpaperManager.getInstance(context).setBitmap(bitmap, null, true, flags);
            Log.d(TAG, "Static wallpaper refreshed for the new day.");
            return true;
        } catch (Throwable e) {
            Log.e(TAG, "Failed to refresh static wallpaper", e);
            return false;
        } finally {
            if (bitmap != null) bitmap.recycle();
        }
    }

    public static void scheduleNextUpdate(Context context) {
        try {
            Calendar currentDate = Calendar.getInstance();
            Calendar dueDate = Calendar.getInstance();
            
            // Refresh just after local midnight. WorkManager is deliberately a catch-up
            // mechanism: it is not permitted to promise exact wall-clock execution.
            dueDate.set(Calendar.HOUR_OF_DAY, 0);
            dueDate.set(Calendar.MINUTE, 2);
            dueDate.set(Calendar.SECOND, 0);
            dueDate.set(Calendar.MILLISECOND, 0);
            
            if (dueDate.before(currentDate) || dueDate.equals(currentDate)) {
                dueDate.add(Calendar.DAY_OF_YEAR, 1);
            }
            
            long timeDiff = dueDate.getTimeInMillis() - currentDate.getTimeInMillis();
            if (timeDiff <= 0) {
                timeDiff = 60 * 1000L; // Fallback 1 min
            }
            
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(WallpaperWorker.class)
                    .setInitialDelay(timeDiff, TimeUnit.MILLISECONDS)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.MINUTES)
                    .build();
                    
            WorkManager.getInstance(context).enqueueUniqueWork(
                    WORK_NAME,
                    ExistingWorkPolicy.REPLACE,
                    workRequest
            );
            scheduleExactAlarmWhenAllowed(context, dueDate.getTimeInMillis());
            Log.d(TAG, "Scheduled next wallpaper update in " + (timeDiff / 1000) + " seconds.");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to schedule next wallpaper update", t);
        }
    }

    private static void scheduleExactAlarmWhenAllowed(Context context, long triggerAtMs) {
        try {
            AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarms == null || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarms.canScheduleExactAlarms())) {
                return;
            }
            Intent intent = new Intent(context, WallpaperUpdateReceiver.class).setAction(ACTION_DAILY_REFRESH);
            PendingIntent pending = PendingIntent.getBroadcast(context, 9042, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
            } else {
                alarms.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Exact wallpaper alarm unavailable; WorkManager fallback remains active.", t);
        }
    }
}
