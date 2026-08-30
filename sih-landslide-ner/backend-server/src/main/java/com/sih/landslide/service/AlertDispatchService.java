package com.sih.landslide.service;

import com.sih.landslide.dto.AlertCheckResponseDto;
import com.sih.landslide.model.*;
import com.sih.landslide.notification.NotificationProvider;
import com.sih.landslide.repository.AlertLogRepository;
import com.sih.landslide.repository.AuthorityContactRepository;
import com.sih.landslide.repository.RiskZoneRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AlertDispatchService {

    private static final Logger logger = LoggerFactory.getLogger(AlertDispatchService.class);

    private final RiskZoneRepository riskZoneRepository;
    private final AlertLogRepository alertLogRepository;
    private final AuthorityContactRepository authorityContactRepository;
    private final NotificationProvider fcmProvider;
    private final NotificationProvider smsProvider;

    // Default cooldown duration: 6 hours
    private static final long COOLDOWN_HOURS = 6L;

    public AlertDispatchService(
            RiskZoneRepository riskZoneRepository,
            AlertLogRepository alertLogRepository,
            AuthorityContactRepository authorityContactRepository,
            @Qualifier("fcmNotificationProvider") NotificationProvider fcmProvider,
            @Qualifier("twilioMsg91NotificationProvider") NotificationProvider smsProvider) {
        this.riskZoneRepository = riskZoneRepository;
        this.alertLogRepository = alertLogRepository;
        this.authorityContactRepository = authorityContactRepository;
        this.fcmProvider = fcmProvider;
        this.smsProvider = smsProvider;
    }

    /**
     * Performs spatial check against risk_zones table with buffers (CRITICAL=2000m, HIGH=500m)
     * and dispatches warnings if not on cooldown.
     */
    @Transactional
    public AlertCheckResponseDto checkAndDispatch(UserMobile user, double lat, double lng) {
        // Buffer settings in meters: CRITICAL = 5000m, HIGH = 2500m (covers 1.1km grid spacing without dead zones)
        double highBufferMeters = 2500.0;
        double criticalBufferMeters = 5000.0;

        List<RiskZone> matchedZones = riskZoneRepository.findHazardMatch(
                lat, lng, highBufferMeters, criticalBufferMeters);

        if (matchedZones.isEmpty()) {
            return AlertCheckResponseDto.builder()
                    .inRiskZone(false)
                    .riskLevel("SAFE")
                    .district(user != null && user.getDistrict() != null ? user.getDistrict() : "Dima Hasao")
                    .distanceMeters(0.0)
                    .probability(0.05)
                    .advisory("You are currently in a SAFE area. Continuous landslide monitoring active.")
                    .actionRequired("No immediate action required.")
                    .alertDispatched(false)
                    .checkedAt(LocalDateTime.now())
                    .build();
        }

        // Selected highest hazard zone
        RiskZone targetZone = matchedZones.get(0);
        double distanceMeters = calculateHaversineMeters(lat, lng, targetZone.getLatitude(), targetZone.getLongitude());
        boolean dispatched = false;

        if (user != null) {
            dispatched = evaluateAndDispatchUserAlert(user, targetZone, distanceMeters);
        }

        // Trigger parallel authority alert
        triggerAuthorityAlertsInternal(targetZone);

        String advisory = buildUserAdvisoryText(targetZone.getRiskLevel(), targetZone.getDistrict());
        String action = "CRITICAL".equalsIgnoreCase(targetZone.getRiskLevel()) ?
                "IMMEDIATE EVACUATION: Move away from steep slopes, hill cuttings, and stream beds." :
                "ALERT: Monitor rainfall warnings, avoid night travel on vulnerable hill roads.";

        return AlertCheckResponseDto.builder()
                .inRiskZone(true)
                .riskLevel(targetZone.getRiskLevel())
                .zoneId(targetZone.getId())
                .district(targetZone.getDistrict())
                .distanceMeters(Math.round(distanceMeters * 10.0) / 10.0)
                .probability(targetZone.getProbability())
                .advisory(advisory)
                .actionRequired(action)
                .alertDispatched(dispatched)
                .checkedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Dispatch alert to citizen user if cooldown has expired (default 6h)
     */
    private boolean evaluateAndDispatchUserAlert(UserMobile user, RiskZone zone, double distanceMeters) {
        LocalDateTime now = LocalDateTime.now();

        // 1. Check alert_log for active cooldown for (user_id, risk_zone_id)
        List<AlertLog> activeUserCooldowns = alertLogRepository.findActiveCooldownForUser(user.getId(), zone.getId(), now);
        if (!activeUserCooldowns.isEmpty()) {
            logger.info("⏳ Cooldown active for user #{} on RiskZone #{}. Skipping user dispatch.", user.getId(), zone.getId());
            return false;
        }

        // 2. Prepare message & payload
        String title = "🚨 LANDSLIDE EARLY WARNING [" + zone.getRiskLevel() + "]";
        String body = String.format("Risk Level: %s | Zone #%d in %s (~%.0fm away). %s",
                zone.getRiskLevel(), zone.getId(), zone.getDistrict(), distanceMeters,
                buildUserAdvisoryText(zone.getRiskLevel(), zone.getDistrict()));

        Map<String, String> data = new HashMap<>();
        data.put("zone_id", String.valueOf(zone.getId()));
        data.put("risk_level", zone.getRiskLevel());
        data.put("district", zone.getDistrict());
        data.put("click_action", "FLUTTER_NOTIFICATION_CLICK");

        // 3. Dispatch Push + SMS
        fcmProvider.sendPush(user, title, body, data);
        smsProvider.sendSms(user.getMobileNumber(), body);

        // 4. Log in alert_log with cooldown_expires_at = now + 6h
        LocalDateTime expiresAt = now.plusHours(COOLDOWN_HOURS);

        AlertLog pushLog = AlertLog.builder()
                .user(user)
                .riskZoneId(zone.getId())
                .channel(AlertChannel.PUSH)
                .sentAt(now)
                .cooldownExpiresAt(expiresAt)
                .build();

        AlertLog smsLog = AlertLog.builder()
                .user(user)
                .riskZoneId(zone.getId())
                .channel(AlertChannel.SMS)
                .sentAt(now)
                .cooldownExpiresAt(expiresAt)
                .build();

        alertLogRepository.save(pushLog);
        alertLogRepository.save(smsLog);

        logger.info("✅ Citizen warning dispatched to {} for Zone #{}. Cooldown set to {}",
                user.getMobileNumber(), zone.getId(), expiresAt);
        return true;
    }

    /**
     * Dispatch alert to local district authorities if cooldown has expired (default 6h)
     */
    @Transactional
    public void triggerAuthorityAlertsInternal(RiskZone zone) {
        LocalDateTime now = LocalDateTime.now();
        List<AuthorityContact> contacts = authorityContactRepository.findByDistrict(zone.getDistrict());

        if (contacts.isEmpty()) {
            logger.info("ℹ️ No authority contacts found for district {}. Seeding default pilot authority...", zone.getDistrict());
            AuthorityContact defaultAuth = AuthorityContact.builder()
                    .district(zone.getDistrict())
                    .role("District Disaster Management Officer (DDMO)")
                    .phoneNumber("+919435001122")
                    .email("ddmo." + zone.getDistrict().toLowerCase().replace(" ", "") + "@assam.gov.in")
                    .createdAt(now)
                    .build();
            contacts = List.of(authorityContactRepository.save(defaultAuth));
        }

        for (AuthorityContact contact : contacts) {
            List<AlertLog> activeAuthCooldowns = alertLogRepository.findActiveCooldownForAuthority(
                    contact.getId(), zone.getId(), now);

            if (!activeAuthCooldowns.isEmpty()) {
                logger.info("⏳ Cooldown active for authority contact #{} ({}) on Zone #{}. Skipping.",
                        contact.getId(), contact.getRole(), zone.getId());
                continue;
            }

            String deepLinkUrl = "http://localhost:5173/alerts?zoneId=" + zone.getId();
            String authorityMessage = String.format(
                    "🚨 [DISASTER MANAGEMENT ALERT] %s - Landslide Threat [%s] detected in %s (Zone #%d). Deep-Link Dashboard: %s",
                    contact.getRole(), zone.getRiskLevel(), zone.getDistrict(), zone.getId(), deepLinkUrl
            );

            smsProvider.sendSms(contact.getPhoneNumber(), authorityMessage);

            LocalDateTime expiresAt = now.plusHours(COOLDOWN_HOURS);
            AlertLog authLog = AlertLog.builder()
                    .authorityContact(contact)
                    .riskZoneId(zone.getId())
                    .channel(AlertChannel.SMS)
                    .sentAt(now)
                    .cooldownExpiresAt(expiresAt)
                    .build();

            alertLogRepository.save(authLog);
            logger.info("📢 Authority alert dispatched to {} ({}) for Zone #{}. Cooldown set to {}",
                    contact.getPhoneNumber(), contact.getRole(), zone.getId(), expiresAt);
        }
    }

    private String buildUserAdvisoryText(String riskLevel, String district) {
        if ("CRITICAL".equalsIgnoreCase(riskLevel)) {
            return "CRITICAL DANGER: Saturated slopes ahead. Move away from escarpments & rivers. Seek shelter in designated safe centers.";
        } else if ("HIGH".equalsIgnoreCase(riskLevel)) {
            return "HIGH RISK: Severe rainfall accumulation. Avoid steep hill cutting areas and night travel on mountain highways.";
        }
        return "Exercise caution near vulnerable slopes and watch for falling debris.";
    }

    private double calculateHaversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
