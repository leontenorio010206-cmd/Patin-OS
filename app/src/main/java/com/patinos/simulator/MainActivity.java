package com.patinos.simulator;

import android.app.Activity;
import android.os.Build;
import android.graphics.Color;
import android.graphics.Insets;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Offline Android host. No network permission; only trusted asset origin can access JS bridge. */
public class MainActivity extends Activity {
    private static final int OPEN_PROJECT = 2401;
    private static final int SAVE_PROJECT = 2402;
    private static final int OPEN_WEB_FILE = 2403;
    private WebView web;
    private String pendingJson;
    private String pendingFileName = "circuito.patinos.json";
    private String pendingMime = "application/json";
    private ValueCallback<Uri[]> chooserCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout shell = new FrameLayout(this);
        shell.setBackgroundColor(Color.rgb(8, 9, 10));
        web = new WebView(this);
        shell.addView(web, new FrameLayout.LayoutParams(-1, -1));
        // Android 15+ draws edge-to-edge by default: keep app controls below
        // the status bar and above gesture/navigation controls.
        if (Build.VERSION.SDK_INT >= 35) {
            shell.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                shell.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        setContentView(shell);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);  // android_asset only; do not load untrusted URLs.
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return !url.startsWith("file:///android_asset/"); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) { return !request.getUrl().toString().startsWith("file:///android_asset/"); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (chooserCallback != null) chooserCallback.onReceiveValue(null);
                chooserCallback = cb;
                try { Intent intent = params.createIntent(); startActivityForResult(intent, OPEN_WEB_FILE); return true; }
                catch (Exception e) { chooserCallback = null; cb.onReceiveValue(null); return false; }
            }
        });
        web.addJavascriptInterface(new NativeBridge(), "AndroidBridge");
        web.loadUrl("file:///android_asset/index.html");
    }

    public class NativeBridge {
        @JavascriptInterface public void saveJson(String json) {
            pendingJson = json;
            pendingFileName = "circuito.patinos.json";
            pendingMime = "application/json";
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(pendingMime);
                i.putExtra(Intent.EXTRA_TITLE, pendingFileName);
                startActivityForResult(i, SAVE_PROJECT);
            });
        }
        @JavascriptInterface public void saveSpice(String text) {
            if (text == null || text.length() > 4_000_000) return;
            pendingJson = text;
            pendingFileName = "patin-os.cir";
            pendingMime = "text/plain";
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(pendingMime);
                i.putExtra(Intent.EXTRA_TITLE, pendingFileName);
                startActivityForResult(i, SAVE_PROJECT);
            });
        }
        @JavascriptInterface public void openJson() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "application/xml", "text/xml", "text/plain", "application/octet-stream"});
                startActivityForResult(i, OPEN_PROJECT);
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == OPEN_WEB_FILE) {
            if (chooserCallback != null) { chooserCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data)); chooserCallback = null; }
            return;
        }
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        try {
            if (request == SAVE_PROJECT && pendingJson != null) {
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("No se pudo escribir el archivo");
                    out.write(pendingJson.getBytes(StandardCharsets.UTF_8));
                }
                pendingJson = null;
                toastJs("Proyecto exportado");
            } else if (request == OPEN_PROJECT) {
                byte[] bytes;
                try (InputStream in = getContentResolver().openInputStream(uri)) {
                    if (in == null) throw new IllegalStateException("No se pudo abrir el archivo");
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] block = new byte[8192];
                    int len;
                    while ((len = in.read(block)) != -1) {
                        if (buffer.size() + len > 2_000_000) throw new IllegalArgumentException("Archivo demasiado grande");
                        buffer.write(block, 0, len);
                    }
                    bytes = buffer.toByteArray();
                }
                if (bytes.length > 2_000_000) throw new IllegalArgumentException("Archivo demasiado grande");
                String json = new String(bytes, StandardCharsets.UTF_8);
                web.evaluateJavascript("window.importProjectFromAndroid(" + JSONObject.quote(json) + ")", null);
            }
        } catch (Exception e) { toastJs("Error: " + e.getMessage()); }
    }
    @Override protected void onPause() {
        // Never keep synthetic circuit tones playing behind other Android apps.
        if (web != null) {
            web.evaluateJavascript("window.PatinosPauseAudio && window.PatinosPauseAudio()", null);
            web.onPause();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }
    @Override protected void onDestroy() {
        if (web != null) {
            web.evaluateJavascript("window.PatinosPauseAudio && window.PatinosPauseAudio()", null);
            web.destroy();web=null;
        }
        super.onDestroy();
    }

    private void toastJs(String message) {
        web.evaluateJavascript("window.showMessage(" + JSONObject.quote(message) + ")", null);
    }
    @Override protected void onDestroy() { if (web != null) { web.removeJavascriptInterface("AndroidBridge"); web.destroy(); } super.onDestroy(); }
}
