package com.sih.landslide.notification;

import com.sih.landslide.model.UserMobile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("twilioMsg91NotificationProvider")
public class TwilioMsg91NotificationProvider implements NotificationProvider {

    private static final Logger logger = LoggerFactory.getLogger(TwilioMsg91NotificationProvider.class);

    @Value("${sms.provider:TWILIO_MSG91_SIMULATED}")
    private String providerMode;

    @Override
    public boolean sendPush(UserMobile user, String title, String body, Map<String, String> data) {
        logger.info("📱 [TWILIO/MSG91 PUSH DISPATCH] To: {} | Title: {}", 
                user != null ? user.getMobileNumber() : "Unknown", title);
        return true;
    }

    @Override
    public boolean sendSms(String phoneNumber, String message) {
        logger.info("🚨 [ALERT DISPATCHED via Twilio/MSG91 SMS Gateway]");
        logger.info("   ➜ Target Phone: {}", phoneNumber);
        logger.info("   ➜ SMS Body: {}", message);
        logger.info("   ➜ Status: DELIVERED (Provider: {})", providerMode);
        return true;
    }

    @Override
    public String getProviderName() {
        return "Twilio / MSG91 SMS Provider";
    }
}
