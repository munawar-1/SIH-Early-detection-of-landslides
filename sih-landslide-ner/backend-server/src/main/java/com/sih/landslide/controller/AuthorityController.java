package com.sih.landslide.controller;

import com.sih.landslide.model.AlertLog;
import com.sih.landslide.model.AuthorityContact;
import com.sih.landslide.repository.AlertLogRepository;
import com.sih.landslide.repository.AuthorityContactRepository;
import com.sih.landslide.security.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/authority")
@CrossOrigin(origins = "*")
public class AuthorityController {

    private final AlertLogRepository alertLogRepository;
    private final AuthorityContactRepository authorityContactRepository;
    private final JwtService jwtService;

    public AuthorityController(AlertLogRepository alertLogRepository,
                               AuthorityContactRepository authorityContactRepository,
                               JwtService jwtService) {
        this.alertLogRepository = alertLogRepository;
        this.authorityContactRepository = authorityContactRepository;
        this.jwtService = jwtService;
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<Map<String, Object>>> getAuthorityAlertFeed(
            Authentication authentication,
            @RequestParam(required = false, defaultValue = "Dima Hasao") String district) {
        
        String targetDistrict = district;
        if (authentication != null && authentication.getCredentials() instanceof String) {
            String token = (String) authentication.getCredentials();
            String tokenDistrict = jwtService.extractDistrict(token);
            if (tokenDistrict != null) targetDistrict = tokenDistrict;
        }

        List<AlertLog> logs = alertLogRepository.findByAuthorityContact_DistrictOrderBySentAtDesc(targetDistrict);
        if (logs.isEmpty()) {
            logs = alertLogRepository.findAllByOrderBySentAtDesc();
        }

        final String districtName = targetDistrict;

        List<Map<String, Object>> feed = logs.stream().map(log -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", log.getId());
            item.put("risk_zone_id", log.getRiskZoneId());
            item.put("channel", log.getChannel() != null ? log.getChannel().name() : "SMS");
            item.put("sent_at", log.getSentAt());
            item.put("cooldown_expires_at", log.getCooldownExpiresAt());
            if (log.getAuthorityContact() != null) {
                item.put("authority_role", log.getAuthorityContact().getRole());
                item.put("authority_phone", log.getAuthorityContact().getPhoneNumber());
                item.put("district", log.getAuthorityContact().getDistrict());
            } else if (log.getUser() != null) {
                item.put("user_mobile", log.getUser().getMobileNumber());
                item.put("district", log.getUser().getDistrict());
            } else {
                item.put("district", districtName);
            }
            item.put("deep_link", "http://localhost:5173/alerts?zoneId=" + log.getRiskZoneId());
            return item;
        }).toList();

        return ResponseEntity.ok(feed);
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<AuthorityContact>> getContacts(
            @RequestParam(required = false, defaultValue = "Dima Hasao") String district) {
        List<AuthorityContact> contacts = authorityContactRepository.findByDistrict(district);
        return ResponseEntity.ok(contacts);
    }
}
