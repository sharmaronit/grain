package com.dailyclone.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.app.WallpaperManager;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import org.json.JSONArray;
import org.json.JSONObject;

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

            } catch (Exception e) {
                Log.e(TAG, "Failed to update static wallpaper", e);
                return Result.failure();
            } finally {
                if (bitmap != null) bitmap.recycle();
            }
        }

        // Schedule the next one for next midnight
        scheduleNextUpdate(context);
        return Result.success();
    }

    public static void scheduleNextUpdate(Context context) {
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
        
        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(WallpaperWorker.class)
                .setInitialDelay(timeDiff, TimeUnit.MILLISECONDS)
                .build();
                
        WorkManager.getInstance(context).enqueueUniqueWork(
                "WallpaperMidnightUpdate",
                androidx.work.ExistingWorkPolicy.REPLACE,
                workRequest
        );
        Log.d(TAG, "Scheduled next wallpaper update in " + (timeDiff / 1000) + " seconds.");
    }
}

