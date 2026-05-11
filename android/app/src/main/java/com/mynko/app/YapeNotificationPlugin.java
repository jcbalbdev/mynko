package com.mynko.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "YapeNotification")
public class YapeNotificationPlugin extends Plugin {

    @Override
    public void load() {
        YapeListenerService.pluginRef = this;
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        String listeners = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        boolean granted = listeners != null
            && listeners.contains(getContext().getPackageName());

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getPendingPayment(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
            YapeListenerService.PREFS_NAME, Context.MODE_PRIVATE
        );

        boolean pending = prefs.getBoolean("pending", false);
        JSObject result = new JSObject();

        if (pending) {
            result.put("pending", true);
            result.put("amount",  prefs.getString("amount",  ""));
            result.put("contact", prefs.getString("contact", ""));
            result.put("type",    prefs.getString("type",    ""));
            result.put("rawText", prefs.getString("rawText", ""));
            prefs.edit().putBoolean("pending", false).apply();
        } else {
            result.put("pending", false);
        }

        call.resolve(result);
    }

    void onYapePayment(String amount, String contact, String type, String rawText) {
        JSObject data = new JSObject();
        data.put("amount",   amount);
        data.put("contact",  contact);
        data.put("type",     type);
        data.put("rawText",  rawText);
        notifyListeners("yapePayment", data);
    }
}
