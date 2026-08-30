package com.sih.landslide.controller;

import com.sih.landslide.dto.AlertCheckRequestDto;
import com.sih.landslide.dto.AlertCheckResponseDto;
import com.sih.landslide.model.RiskZone;
import com.sih.landslide.model.UserMobile;
import com.sih.landslide.repository.RiskZoneRepository;
import com.sih.landslide.repository.UserMobileRepository;
import com.sih.landslide.service.AlertDispatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertsController {

    private final AlertDispatchService alertDispatchService;
    private final UserMobileRepository userMobileRepository;
    private final RiskZoneRepository riskZoneRepository;

    public AlertsController(AlertDispatchService alertDispatchService,
                            UserMobileRepository userMobileRepository,
                            RiskZoneRepository riskZoneRepository) {
        this.alertDispatchService = alertDispatchService;
        this.userMobileRepository = userMobileRepository;
        this.riskZoneRepository = riskZoneRepository;
    }

    @PostMapping("/check")
    public ResponseEntity<AlertCheckResponseDto> checkAlert(
            Authentication authentication,
            @RequestBody AlertCheckRequestDto dto) {
        
        UserMobile user = null;
        if (authentication != null && authentication.getName() != null) {
            user = userMobileRepository.findByMobileNumber(authentication.getName()).orElse(null);
        }

        AlertCheckResponseDto response = alertDispatchService.checkAndDispatch(user, dto.getLat(), dto.getLng());
        return ResponseEntity.ok(response);
    }

    private static volatile Map<String, Object> latestBroadcast = null;
    private static volatile long latestBroadcastTimestamp = 0;

    @PostMapping("/broadcast")
    public ResponseEntity<Map<String, Object>> broadcastAlert(@RequestBody Map<String, Object> payload) {
        java.util.Map<String, Object> alert = new java.util.HashMap<>(payload);
        alert.put("active", true);
        alert.put("broadcast_id", System.currentTimeMillis());
        alert.put("timestamp", java.time.LocalDateTime.now().toString());
        latestBroadcast = alert;
        latestBroadcastTimestamp = System.currentTimeMillis();
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Emergency broadcast dispatched successfully."
        ));
    }

    @GetMapping("/active-broadcast")
    public ResponseEntity<Map<String, Object>> getActiveBroadcast() {
        if (latestBroadcast != null && (System.currentTimeMillis() - latestBroadcastTimestamp < 600000)) {
            return ResponseEntity.ok(latestBroadcast);
        }
        return ResponseEntity.ok(Map.of("active", false));
    }

    @PostMapping("/dismiss-broadcast")
    public ResponseEntity<Map<String, String>> dismissBroadcast() {
        latestBroadcast = null;
        latestBroadcastTimestamp = 0;
        return ResponseEntity.ok(Map.of("status", "DISMISSED"));
    }
}
