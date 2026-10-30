# Keep only the reflected WebView bridge; R8 may shrink remaining Java code.
-keepclassmembers class com.patinos.simulator.MainActivity$NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
