package com.dailyclone.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.app.WallpaperManager;
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

        boolean updateSuccess = true;

        try {
            if (isStatic && jsonStr != null) {
                Bitmap bitmap = null;
                try {
                    GrainWallpaperService.WallpaperData parsed = GrainWallpaperService.WallpaperData.fromJson(jsonStr);

                    // Generate new bitmap (drawHeatmapToCanvas handles dynamic column/day shifting)
                    DisplayMetrics metrics = context.getResources().getDisplayMetrics();
                    int width  = metrics.widthPixels;
                    int height = metrics.heightPixels;

                    bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                    Canvas canvas = new Canvas(bitmap);
                    GrainWallpaperService.drawHeatmapToCanvas(context, canvas, width, height, parsed);

                    String screenTarget = prefs.getString("GRAIN_STATIC_SCREEN_TARGET", "both");
                    int flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
                    if ("home".equals(screenTarget)) {
                        flags = WallpaperManager.FLAG_SYSTEM;
                    } else if ("lock".equals(screenTarget)) {
                        flags = WallpaperManager.FLAG_LOCK;
                    }

                    WallpaperManager.getInstance(context).setBitmap(bitmap, null, true, flags);
                    Log.d(TAG, "Static wallpaper updated successfully for the new day.");

                } catch (Throwable e) {
                    Log.e(TAG, "Failed to update static wallpaper", e);
                    updateSuccess = false;
                } finally {
                    if (bitmap != null) bitmap.recycle();
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "Unexpected error in WallpaperWorker", t);
            updateSuccess = false;
        } finally {
            // Guarantee next midnight update is ALWAYS scheduled, preventing chain breakage
            scheduleNextUpdate(context);
        }

        if (!updateSuccess && getRunAttemptCount() < 3) {
            Log.w(TAG, "Wallpaper update failed, retrying attempt #" + getRunAttemptCount());
            return Result.retry();
        }

        return Result.success();
    }

    public static void scheduleNextUpdate(Context context) {
        try {
            Calendar currentDate = Calendar.getInstance();
            Calendar dueDate = Calendar.getInstance();
            
            // Set to exactly midnight tonight
            dueDate.set(Calendar.HOUR_OF_DAY, 0);
            dueDate.set(Calendar.MINUTE, 0);
            dueDate.set(Calendar.SECOND, 0);
            dueDate.set(Calendar.MILLISECOND, 0);
            
            if (dueDate.before(currentDate) || dueDate.equals(currentDate)) {
                dueDate.add(Calendar.HOUR_OF_DAY, 24);
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
                    "WallpaperMidnightUpdate",
                    ExistingWorkPolicy.REPLACE,
                    workRequest
            );
            Log.d(TAG, "Scheduled next wallpaper update in " + (timeDiff / 1000) + " seconds.");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to schedule next wallpaper update", t);
        }
    }
}

