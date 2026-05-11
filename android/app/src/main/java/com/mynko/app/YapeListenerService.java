package com.mynko.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class YapeListenerService extends NotificationListenerService {

    private static final String TAG          = "YapeListener";
    private static final String YAPE_PACKAGE = "com.bcp.innovacxion.yapeapp";
    public  static final String PREFS_NAME   = "yape_pending";
    private static final String CHANNEL_ID   = "yape_detected";

    private static final Pattern AMOUNT_PATTERN =
        Pattern.compile("S/\\s*([\\d]{1,3}(?:[,.]\\d{3})*(?:[.,]\\d{1,2})?)");

    private static final Pattern RECIPIENT_PATTERN =
        Pattern.compile("\\ba\\s+([\\p{L}\\s*]+?)(?:\\s+por\\s+S/|\\.|$)");

    private static final Pattern SENDER_PATTERN =
        Pattern.compile("^([\\p{L}\\s*]+?)\\s+te\\s+(?:envió|yapeó)");

    static YapeNotificationPlugin pluginRef;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        Log.d(TAG, "Notificación recibida de: " + sbn.getPackageName());
        if (!YAPE_PACKAGE.equals(sbn.getPackageName())) return;

        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        CharSequence textSeq = notification.extras.getCharSequence(Notification.EXTRA_TEXT);
        if (textSeq == null) return;

        String body = textSeq.toString();
        Log.d(TAG, "Yape notification: " + body);

        boolean isEgreso  = body.contains("yapeaste") || body.contains("Yapeaste")
                         || body.contains("enviaste")  || body.contains("Enviaste");

        boolean isIngreso = body.contains("te envió")  || body.contains("te yapeó")
                         || body.contains("te yapeo")  || body.contains("te Yapeó");

        if (!isEgreso && !isIngreso) return;

        Matcher amountMatcher = AMOUNT_PATTERN.matcher(body);
        if (!amountMatcher.find()) return;

        String rawAmount = amountMatcher.group(1).replaceAll(",(?=\\d{3})", "");
        String amount    = rawAmount.replace(",", ".");

        String contact = "";
        if (isEgreso) {
            Matcher m = RECIPIENT_PATTERN.matcher(body);
            if (m.find()) contact = m.group(1).trim();
        } else {
            Matcher m = SENDER_PATTERN.matcher(body);
            if (m.find()) contact = m.group(1).trim();
        }

        String type = isIngreso ? "ingreso" : "egreso";
        Log.d(TAG, "Parsed → amount=" + amount + " contact=" + contact + " type=" + type);

        // Guarda el pago para que la app lo lea al abrirse
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString("amount",  amount)
            .putString("contact", contact)
            .putString("type",    type)
            .putString("rawText", body)
            .putBoolean("pending", true)
            .apply();

        // Si la app está en frente, notifica directamente
        if (pluginRef != null) {
            pluginRef.onYapePayment(amount, contact, type, body);
        }

        // Lanza notificación local para abrir la app
        fireLocalNotification(amount, contact, type);
    }

    private void fireLocalNotification(String amount, String contact, String type) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "Pagos Yape", NotificationManager.IMPORTANCE_HIGH
        );
        nm.createNotificationChannel(channel);

        String title = type.equals("ingreso")
            ? "Ingreso con Yape detectado"
            : "Pago con Yape detectado";

        String contactLabel = (contact != null && !contact.isEmpty()) ? contact : "";
        String message = type.equals("ingreso")
            ? "S/ " + amount + " de " + contactLabel + ". Toca para registrar."
            : "S/ " + amount + " a "  + contactLabel + ". Toca para registrar.";

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification localNotif = new Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_cat)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build();

        nm.notify(9001, localNotif);
    }
}
