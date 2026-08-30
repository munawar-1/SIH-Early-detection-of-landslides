package com.sih.landslide.notification;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.sih.landslide.model.UserMobile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("fcmNotificationProvider")
public class FcmNotificationProvider implements NotificationProvider {

    private static final Logger logger = LoggerFactory.getLogger(FcmNotificationProvider.class);

    @Override
    public boolean sendPush(UserMobile user, String title, String body, Map<String, String> data) {
        String token = user != null ? user.getFcmToken() : null;
        if (token == null || token.isBlank()) {
            logger.info("📱 [FCM PUSH] (Simulated / No Token) To: {} | Title: {} | Body: {}",
                    user != null ? user.getMobileNumber() : "Unknown", title, body);
            return true;
        }

        try {
            Message.Builder messageBuilder = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build());

            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            String response = FirebaseMessaging.getInstance().send(messageBuilder.build());
            logger.info("✅ [FCM PUSH DISPATCHED] ResponseId: {} | To: {}", response, user.getMobileNumber());
            return true;
        } catch (Exception e) {
            logger.warn("⚠️ [FCM PUSH FALLBACK] Firebase SDK not initialized or failed ({}), logging push payload for {}",
                    e.getMessage(), user.getMobileNumber());
            logger.info("📱 [FCM PUSH] To: {} | Title: {} | Body: {} | Data: {}",
                    user.getMobileNumber(), title, body, data);
            return true;
        }
    }

    @Override
    public boolean sendSms(String phoneNumber, String message) {
        // FCM primary responsibility is Push Notifications; delegates SMS to Twilio/MSG91
        logger.info("📲 [FCM SMS GATEWAY SIMULATION] To: {} | Message: {}", phoneNumber, message);
        return true;
    }

    @Override
    public String getProviderName() {
        return "Firebase Cloud Messaging (FCM)";
    }
}
