package com.dailyclone.app;

import android.app.WallpaperManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Wallpaper")
public class WallpaperPlugin extends Plugin {

    @PluginMethod
    public void setWallpaper(PluginCall call) {
        String base64 = call.getString("base64");
        if (base64 == null) {
            call.reject("Must provide base64 string");
            return;
        }

        // Clean up base64 string if it contains data URI prefix
        if (base64.contains(",")) {
            base64 = base64.split(",")[1];
        }

        try {
            byte[] decodedString = Base64.decode(base64, Base64.DEFAULT);
            Bitmap decodedByte = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
            
            WallpaperManager wallpaperManager = WallpaperManager.getInstance(getContext());
            
            Integer screenType = call.getInt("screenType", WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK);
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                wallpaperManager.setBitmap(decodedByte, null, true, screenType);
            } else {
                wallpaperManager.setBitmap(decodedByte);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set wallpaper", e);
        }
    }
}
