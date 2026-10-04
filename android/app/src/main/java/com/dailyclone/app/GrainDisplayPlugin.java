package com.dailyclone.app;

import android.graphics.Rect;
import android.os.Build;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Reports window cutouts in WebView pixel coordinates; no camera permission is needed. */
@CapacitorPlugin(name = "GrainDisplay")
public class GrainDisplayPlugin extends Plugin {
    private View observedView;
    private String lastGeometry = "";
    private final View.OnLayoutChangeListener layoutListener = (v, l, t, r, b, ol, ot, or, ob) -> publish();

    @Override public void load() {
        getActivity().runOnUiThread(() -> {
            observedView = getBridge().getWebView();
            observedView.addOnLayoutChangeListener(layoutListener);
            observedView.post(this::publish);
        });
    }

    @PluginMethod public void getGeometry(PluginCall call) {
        getActivity().runOnUiThread(() -> call.resolve(geometry()));
    }

    private JSObject geometry() {
        View webView = getBridge().getWebView();
        int[] origin = new int[2];
        webView.getLocationInWindow(origin);
        WindowInsets insets = getActivity().getWindow().getDecorView().getRootWindowInsets();
        JSObject result = new JSObject();
        result.put("width", webView.getWidth());
        result.put("height", webView.getHeight());
        result.put("available", insets != null && webView.getWidth() > 0);
        int statusTop = 0;
        if (insets != null) {
            statusTop = Build.VERSION.SDK_INT >= 30
                ? insets.getInsetsIgnoringVisibility(WindowInsets.Type.statusBars()).top
                : insets.getSystemWindowInsetTop();
        }
        result.put("statusBarTop", Math.max(0, statusTop - origin[1]));
        JSArray cutouts = new JSArray();
        if (insets != null && Build.VERSION.SDK_INT >= 28) {
            DisplayCutout cutout = insets.getDisplayCutout();
            if (cutout != null) for (Rect rect : cutout.getBoundingRects()) {
                JSObject bounds = new JSObject();
                bounds.put("left", rect.left - origin[0]);
                bounds.put("top", rect.top - origin[1]);
                bounds.put("right", rect.right - origin[0]);
                bounds.put("bottom", rect.bottom - origin[1]);
                cutouts.put(bounds);
            }
        }
        result.put("cutouts", cutouts);
        return result;
    }

    private void publish() {
        JSObject result = geometry();
        String serialized = result.toString();
        if (!serialized.equals(lastGeometry)) {
            lastGeometry = serialized;
            notifyListeners("geometryChanged", result);
        }
    }

    @Override protected void handleOnResume() {
        if (observedView != null) observedView.post(this::publish);
    }

    @Override protected void handleOnConfigurationChanged(android.content.res.Configuration config) {
        if (observedView != null) observedView.post(this::publish);
    }

    @Override protected void handleOnDestroy() {
        if (observedView != null) observedView.removeOnLayoutChangeListener(layoutListener);
        observedView = null;
    }
}
