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
    private final PredictionController predictionController;

    public AlertsController(AlertDispatchService alertDispatchService,
                            UserMobileRepository userMobileRepository,
                            RiskZoneRepository riskZoneRepository,
                            PredictionController predictionController) {
        this.alertDispatchService = alertDispatchService;
        this.userMobileRepository = userMobileRepository;
        this.riskZoneRepository = riskZoneRepository;
        this.predictionController = predictionController;
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
        if (!response.isInRiskZone() && dto.getLat() != null && dto.getLng() != null) {
            // Dynamically evaluate coordinate using ML microservice & geotechnical database grid
            return predictionController.evaluateCoordinate(dto);
        }
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // 1. MONSOON DISASTER SIMULATOR ENDPOINTS ("Dispatch Emergency Message")
    // =========================================================================

    @PostMapping({"/simulator-dispatch", "/simulator/dispatch"})
    public ResponseEntity<Map<String, Object>> dispatchSimulatorAlert(@RequestBody Map<String, Object> payload) {
        Map<String, Object> dispatched = alertDispatchService.dispatchSimulatorAlert(payload);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "source", "SIMULATOR",
            "broadcast_id", dispatched.get("broadcast_id"),
            "message", "Monsoon simulator emergency message dispatched to Demo phones."
        ));
    }

    @GetMapping({"/simulator/active", "/active-simulator-broadcast"})
    public ResponseEntity<Map<String, Object>> getActiveSimulatorAlert() {
        return ResponseEntity.ok(alertDispatchService.getActiveSimulatorAlert());
    }

    @PostMapping({"/simulator/dismiss", "/dismiss-simulator-broadcast"})
    public ResponseEntity<Map<String, String>> dismissSimulatorAlert() {
        alertDispatchService.dismissSimulatorAlert();
        return ResponseEntity.ok(Map.of("status", "DISMISSED", "source", "SIMULATOR"));
    }

    // =========================================================================
    // 2. LIVE MONITORING DASHBOARD ENDPOINTS ("Broadcast SMS Alert")
    // =========================================================================

    @PostMapping({"/live-broadcast", "/live/broadcast"})
    public ResponseEntity<Map<String, Object>> dispatchLiveAlert(@RequestBody Map<String, Object> payload) {
        Map<String, Object> dispatched = alertDispatchService.dispatchLiveMonitoringAlert(payload);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "source", "LIVE_MONITORING",
            "broadcast_id", dispatched.get("broadcast_id"),
            "message", "Real-time monitoring emergency alert broadcasted to Live phones."
        ));
    }

    @GetMapping({"/live/active", "/active-live-broadcast"})
    public ResponseEntity<Map<String, Object>> getActiveLiveAlert() {
        return ResponseEntity.ok(alertDispatchService.getActiveLiveMonitoringAlert());
    }

    @PostMapping({"/live/dismiss", "/dismiss-live-broadcast"})
    public ResponseEntity<Map<String, String>> dismissLiveAlert() {
        alertDispatchService.dismissLiveMonitoringAlert();
        return ResponseEntity.ok(Map.of("status", "DISMISSED", "source", "LIVE_MONITORING"));
    }

    // =========================================================================
    // 3. BACKWARD COMPATIBILITY ENDPOINTS
    // =========================================================================

    @PostMapping("/broadcast")
    public ResponseEntity<Map<String, Object>> broadcastAlert(@RequestBody Map<String, Object> payload) {
        String source = (String) payload.getOrDefault("source", "LIVE_MONITORING");
        Map<String, Object> dispatched;
        if ("SIMULATOR".equalsIgnoreCase(source)) {
            dispatched = alertDispatchService.dispatchSimulatorAlert(payload);
        } else {
            dispatched = alertDispatchService.dispatchLiveMonitoringAlert(payload);
        }
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "source", dispatched.get("source"),
            "broadcast_id", dispatched.get("broadcast_id"),
            "message", "Emergency broadcast dispatched successfully."
        ));
    }

    @GetMapping("/active-broadcast")
    public ResponseEntity<Map<String, Object>> getActiveBroadcast(@RequestParam(value = "source", required = false) String source) {
        if ("SIMULATOR".equalsIgnoreCase(source)) {
            return ResponseEntity.ok(alertDispatchService.getActiveSimulatorAlert());
        } else if ("LIVE_MONITORING".equalsIgnoreCase(source)) {
            return ResponseEntity.ok(alertDispatchService.getActiveLiveMonitoringAlert());
        }

        // If no source param provided, return active live alert first; if none, check simulator
        Map<String, Object> live = alertDispatchService.getActiveLiveMonitoringAlert();
        if (Boolean.TRUE.equals(live.get("active"))) {
            return ResponseEntity.ok(live);
        }
        Map<String, Object> sim = alertDispatchService.getActiveSimulatorAlert();
        if (Boolean.TRUE.equals(sim.get("active"))) {
            return ResponseEntity.ok(sim);
        }
        return ResponseEntity.ok(Map.of("active", false));
    }

    @PostMapping("/dismiss-broadcast")
    public ResponseEntity<Map<String, String>> dismissBroadcast(@RequestParam(value = "source", required = false) String source) {
        if ("SIMULATOR".equalsIgnoreCase(source)) {
            alertDispatchService.dismissSimulatorAlert();
        } else if ("LIVE_MONITORING".equalsIgnoreCase(source)) {
            alertDispatchService.dismissLiveMonitoringAlert();
        } else {
            alertDispatchService.dismissSimulatorAlert();
            alertDispatchService.dismissLiveMonitoringAlert();
        }
        return ResponseEntity.ok(Map.of("status", "DISMISSED"));
    }
}
