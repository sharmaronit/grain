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
            try {
                JSONObject obj = new JSONObject(jsonStr);

                // Shift main heatmap
                JSONArray heatmap = obj.optJSONArray("heatmap");
                if (heatmap != null) {
                    obj.put("heatmap", shiftHeatmapArray(heatmap));
                }

                // Shift goals heatmaps
                JSONArray stackedGoals = obj.optJSONArray("stackedGoals");
                if (stackedGoals != null) {
                    for (int i = 0; i < stackedGoals.length(); i++) {
                        JSONObject goal = stackedGoals.optJSONObject(i);
                        if (goal != null) {
                            JSONArray goalHeatmap = goal.optJSONArray("heatmap");
                            if (goalHeatmap != null) {
                                goal.put("heatmap", shiftHeatmapArray(goalHeatmap));
                            }
                        }
                    }
                }

                String newJson = obj.toString();
                prefs.edit().putString(GrainWallpaperService.KEY_LIVE_DATA, newJson).apply();

                GrainWallpaperService.WallpaperData parsed = GrainWallpaperService.WallpaperData.fromJson(newJson);

                // Generate new bitmap
                DisplayMetrics metrics = context.getResources().getDisplayMetrics();
                int width  = metrics.widthPixels;
                int height = metrics.heightPixels;

                Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                GrainWallpaperService.drawHeatmapToCanvas(context, canvas, width, height, parsed);

                WallpaperManager.getInstance(context).setBitmap(bitmap);
                Log.d(TAG, "Static wallpaper updated successfully for the new day.");

            } catch (Exception e) {
                Log.e(TAG, "Failed to update static wallpaper", e);
                return Result.failure();
            }
        }

        // Schedule the next one for next midnight
        scheduleNextUpdate(context);
        return Result.success();
    }

    private JSONArray shiftHeatmapArray(JSONArray original) throws Exception {
        if (original == null || original.length() == 0) return original;
        int cols = original.length();
        JSONArray firstCol = original.optJSONArray(0);
        if (firstCol == null) return original;
        int rows = firstCol.length();
        
        int[] flat = new int[cols * rows];
        int index = 0;
        for (int c = 0; c < cols; c++) {
            JSONArray col = original.optJSONArray(c);
            if (col != null) {
                for (int r = 0; r < rows; r++) {
                    flat[index++] = col.optInt(r, 0);
                }
            }
        }
        
        // Shift left by 1
        for (int i = 0; i < flat.length - 1; i++) {
            flat[i] = flat[i + 1];
        }
        flat[flat.length - 1] = 0;
        
        // Unflatten
        JSONArray shifted = new JSONArray();
        index = 0;
        for (int c = 0; c < cols; c++) {
            JSONArray newCol = new JSONArray();
            for (int r = 0; r < rows; r++) {
                newCol.put(flat[index++]);
            }
            shifted.put(newCol);
        }
        return shifted;
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
