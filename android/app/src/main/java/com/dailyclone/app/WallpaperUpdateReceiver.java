package com.dailyclone.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Performs the precise daily static-wallpaper refresh when exact alarms are available. */
public class WallpaperUpdateReceiver extends BroadcastReceiver {
    private static final String TAG = "WallpaperUpdateReceiver";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !WallpaperWorker.ACTION_DAILY_REFRESH.equals(intent.getAction())) return;
        final PendingResult pending = goAsync();
        final Context appContext = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            try {
                SharedPreferences prefs = appContext.getSharedPreferences(
                        GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
                if (prefs.getBoolean("GRAIN_IS_STATIC_FALLBACK", false)) {
                    String data = prefs.getString(GrainWallpaperService.KEY_LIVE_DATA, null);
                    if (data != null) WallpaperWorker.updateStaticWallpaper(appContext, prefs, data);
                }
            } catch (Throwable t) {
                Log.e(TAG, "Exact daily refresh failed", t);
            } finally {
                WallpaperWorker.scheduleNextUpdate(appContext);
                pending.finish();
            }
        });
    }
}
