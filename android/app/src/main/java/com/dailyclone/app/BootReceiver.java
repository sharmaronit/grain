package com.dailyclone.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            try {
                SharedPreferences prefs = context.getSharedPreferences(GrainWallpaperService.PREFS_NAME, Context.MODE_PRIVATE);
                boolean isStatic = prefs.getBoolean("GRAIN_IS_STATIC_FALLBACK", false);

                // If static wallpaper is enabled, ensure midnight update worker is scheduled
                if (isStatic) {
                    Log.d(TAG, "Rescheduling WallpaperWorker after boot/update.");
                    WallpaperWorker.scheduleNextUpdate(context);
                }
            } catch (Throwable t) {
                Log.e(TAG, "Error in BootReceiver", t);
            }
        }
    }
}
