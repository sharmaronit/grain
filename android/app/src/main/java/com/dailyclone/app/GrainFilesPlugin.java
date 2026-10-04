package com.dailyclone.app;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import androidx.core.content.FileProvider;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/** Saves exports through the document picker and shares images using temporary URI grants. */
@CapacitorPlugin(name = "GrainFiles")
public class GrainFilesPlugin extends Plugin {
    @PluginMethod
    public void export(PluginCall call) {
        if (call.getString("content") == null) {
            call.reject("Export content is missing");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/json"));
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "grain-backup.json"));
        startActivityForResult(call, intent, "backupCreated");
    }

    @ActivityCallback
    private void backupCreated(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject response = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        getBridge().execute(() -> {
            try (OutputStream stream = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
                if (stream == null) throw new IllegalStateException("Could not open backup destination");
                stream.write(contentBytes(call));
                stream.flush();
                response.put("saved", true);
                call.resolve(response);
            } catch (Exception error) {
                call.reject("Backup could not be saved", error);
            }
        });
    }

    private byte[] contentBytes(PluginCall call) {
        String content = call.getString("content", "");
        return "base64".equals(call.getString("encoding"))
            ? Base64.decode(content, Base64.DEFAULT) : content.getBytes(StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void shareImage(PluginCall call) {
        getBridge().execute(() -> {
            try {
                File directory = new File(getContext().getCacheDir(), "grain-exports");
                if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Could not create export folder");
                File image = new File(directory, "grain-share.png");
                try (FileOutputStream stream = new FileOutputStream(image)) { stream.write(contentBytes(call)); }
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("image/png");
                intent.putExtra(Intent.EXTRA_STREAM, FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", image));
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().runOnUiThread(() -> {
                    try { startActivityForResult(call, Intent.createChooser(intent, "Share Grain"), "imageShared"); }
                    catch (Exception error) { call.reject("Could not open sharing", error); }
                });
            } catch (Exception error) { call.reject("Could not prepare sharing", error); }
        });
    }

    @ActivityCallback
    private void imageShared(PluginCall call, ActivityResult result) {
        if (call != null) call.resolve();
    }

    @PluginMethod
    public void shareText(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, call.getString("text", ""));
        try { startActivityForResult(call, Intent.createChooser(intent, "Share Grain"), "imageShared"); }
        catch (Exception error) { call.reject("Could not open sharing", error); }
    }
}
