package com.sih.landslide.notification;

import com.sih.landslide.model.UserMobile;
import java.util.Map;

public interface NotificationProvider {

    /**
     * Send Push Notification to Citizen Mobile App
     * @param user Citizen user entity with FCM token
     * @param title Title of warning
     * @param body Body / Advisory message
     * @param data Metadata payload (zoneId, riskLevel, district, etc.)
     * @return true if successfully dispatched
     */
    boolean sendPush(UserMobile user, String title, String body, Map<String, String> data);

    /**
     * Send SMS Notification to Citizen or Authority Contact
     * @param phoneNumber Destination phone number (E.164 format)
     * @param message SMS text body
     * @return true if successfully dispatched
     */
    boolean sendSms(String phoneNumber, String message);

    /**
     * Provider identification name
     */
    String getProviderName();
}
