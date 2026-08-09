package com.dailyclone.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FirebaseAuthenticationPlugin.class);
        registerPlugin(WallpaperPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        // Force WebView to clear cache on launch so fresh Vite JS/CSS bundles are loaded
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.clearCache(true);
            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        }

        // Enable 120Hz / High Refresh Rate if supported
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            android.view.Window window = getWindow();
            android.view.Display display = window.getWindowManager().getDefaultDisplay();
            android.view.Display.Mode[] modes = display.getSupportedModes();
            float maxRefreshRate = 0;
            int maxModeId = 0;
            for (android.view.Display.Mode mode : modes) {
                if (mode.getRefreshRate() > maxRefreshRate) {
                    maxRefreshRate = mode.getRefreshRate();
                    maxModeId = mode.getModeId();
                }
            }
            if (maxModeId != 0) {
                android.view.WindowManager.LayoutParams params = window.getAttributes();
                params.preferredDisplayModeId = maxModeId;
                window.setAttributes(params);
            }
        }
    }
}
