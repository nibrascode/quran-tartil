package com.nibrascode.qurantartil;

import android.content.res.Configuration;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyBars(getResources().getConfiguration());
    }

    @Override
    public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        applyBars(c);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyBars(getResources().getConfiguration());
    }

    // Landscape = reading mode: hide status and navigation bars (swipe from edge shows them briefly).
    private void applyBars(Configuration c) {
        WindowInsetsControllerCompat w = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (c.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            w.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            w.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            w.show(WindowInsetsCompat.Type.systemBars());
        }
    }
}
