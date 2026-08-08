const fs = require('fs');
const path = require('path');

const pluginPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'java', 'com', 'dailyclone', 'app', 'WallpaperPlugin.java');
let pluginContent = fs.readFileSync(pluginPath, 'utf8');

// Add imports
pluginContent = pluginContent.replace('import android.content.SharedPreferences;', 'import android.content.SharedPreferences;\nimport android.graphics.Bitmap;\nimport android.graphics.Canvas;\nimport android.util.DisplayMetrics;');

const newMethods = `
    @PluginMethod
    public void isLiveWallpaperSupported(PluginCall call) {
        JSObject ret = new JSObject();
        // Almost all modern Android devices support live wallpapers, 
        // but we can check if the intent resolves to something.
        Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
        boolean supported = intent.resolveActivity(getContext().getPackageManager()) != null;
        ret.put("supported", supported);
        call.resolve(ret);
    }

    @PluginMethod
    public void setStaticWallpaper(PluginCall call) {
        try {
            JSObject data = call.getData();
            String jsonStr = data != null ? data.toString() : null;

            DisplayMetrics metrics = getContext().getResources().getDisplayMetrics();
            int width = metrics.widthPixels;
            int height = metrics.heightPixels;

            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            GrainWallpaperService.drawHeatmapToCanvas(getContext(), canvas, width, height, jsonStr);

            WallpaperManager manager = WallpaperManager.getInstance(getContext());
            manager.setBitmap(bitmap);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set static wallpaper", e);
        }
    }
`;

pluginContent = pluginContent.replace('public class WallpaperPlugin extends Plugin {', 'public class WallpaperPlugin extends Plugin {' + newMethods);

fs.writeFileSync(pluginPath, pluginContent, 'utf8');
console.log('Fixed WallpaperPlugin');
