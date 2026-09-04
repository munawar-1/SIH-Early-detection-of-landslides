package com.sih.landslide.controller;

import com.sih.landslide.dto.AlertCheckRequestDto;
import com.sih.landslide.dto.AlertCheckResponseDto;
import com.sih.landslide.model.GridPoint;
import com.sih.landslide.repository.GridPointRepository;
import com.sih.landslide.service.OrchestrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/predictions")
@CrossOrigin(origins = "*")
public class PredictionController {

    private static final Logger logger = LoggerFactory.getLogger(PredictionController.class);

    private final GridPointRepository repository;
    private final OrchestrationService orchestrationService;
    private final com.sih.landslide.config.DataSeeder dataSeeder;
    private final WebClient webClient;
    private final String mlServiceUrl;

    public PredictionController(GridPointRepository repository, 
                                OrchestrationService orchestrationService,
                                com.sih.landslide.config.DataSeeder dataSeeder,
                                WebClient.Builder webClientBuilder,
                                @Value("${ml.service.url:http://localhost:8000}") String mlServiceUrl) {
        this.repository = repository;
        this.orchestrationService = orchestrationService;
        this.dataSeeder = dataSeeder;
        this.mlServiceUrl = mlServiceUrl;
        this.webClient = webClientBuilder.baseUrl(mlServiceUrl).build();
    }

    @GetMapping
    public List<GridPoint> getPredictions(@RequestParam(required = false, defaultValue = "Dima Hasao") String district) {
        return repository.findAll();
    }

    @PostMapping("/evaluate-coordinate")
    public ResponseEntity<AlertCheckResponseDto> evaluateCoordinate(
            @RequestBody AlertCheckRequestDto dto) {
        
        Double lat = dto.getLat();
        Double lng = dto.getLng();
        if (lat == null || lng == null) {
            return ResponseEntity.badRequest().build();
        }

        String locationName = dto.getLocationName() != null && !dto.getLocationName().isBlank()
                ? dto.getLocationName()
                : String.format("Sector (%.3f°N, %.3f°E)", lat, lng);

        // 1. Try to invoke FastAPI ML microservice /predict-coordinate
        try {
            Map<String, Object> mlRequest = new HashMap<>();
            mlRequest.put("latitude", lat);
            mlRequest.put("longitude", lng);
            mlRequest.put("location_name", locationName);
            if (dto.getRainDayMinus1Mm() != null) {
                mlRequest.put("rain_day_minus_1_mm", dto.getRainDayMinus1Mm());
            }

            Map mlResult = webClient.post()
                    .uri("/predict-coordinate")
                    .bodyValue(mlRequest)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(4))
                    .block();

            if (mlResult != null && "SUCCESS".equals(mlResult.get("status"))) {
                double prob = mlResult.get("landslide_probability") != null
                        ? ((Number) mlResult.get("landslide_probability")).doubleValue() : 0.05;
                String riskLevel = mlResult.get("risk_level") != null
                        ? mlResult.get("risk_level").toString() : "SAFE";
                boolean inRisk = Boolean.TRUE.equals(mlResult.get("in_risk_zone"))
                        || "CRITICAL".equalsIgnoreCase(riskLevel)
                        || "HIGH".equalsIgnoreCase(riskLevel)
                        || prob >= 0.40;

                String advisory = mlResult.get("advisory") != null ? mlResult.get("advisory").toString() : "";
                String action = mlResult.get("action_required") != null ? mlResult.get("action_required").toString() : "";
                String primaryDriver = mlResult.get("primary_hazard_driver") != null ? mlResult.get("primary_hazard_driver").toString() : "";
                String district = mlResult.get("district") != null ? mlResult.get("district").toString() : "Dima Hasao";

                logger.info("🧠 ML Service predicted coordinate ({}, {}) -> Risk: {}, Prob: {}", lat, lng, riskLevel, prob);

                return ResponseEntity.ok(AlertCheckResponseDto.builder()
                        .inRiskZone(inRisk)
                        .riskLevel(riskLevel)
                        .district(district)
                        .locationName(locationName)
                        .distanceMeters(0.0)
                        .probability(Math.round(prob * 1000.0) / 1000.0)
                        .advisory(advisory)
                        .actionRequired(action)
                        .primaryHazardDriver(primaryDriver)
                        .evaluatedBy("FastAPI Calibrated ML Microservice")
                        .alertDispatched(inRisk)
                        .checkedAt(LocalDateTime.now())
                        .build());
            }
        } catch (Exception e) {
            logger.warn("FastAPI ML microservice /predict-coordinate call note ({}), falling back to database GIS grid & geotechnical model: {}", mlServiceUrl, e.getMessage());
        }

        // 2. Database GIS grid fallback evaluation
        Optional<GridPoint> nearestOpt = repository.findNearestGridPoint(lat, lng);
        if (nearestOpt.isPresent()) {
            GridPoint gp = nearestOpt.get();
            double slope = gp.getSlope() != null ? gp.getSlope() : 3.0;
            double elevation = gp.getElevation() != null ? gp.getElevation() : 500.0;
            
            double dLat = Math.toRadians(lat - gp.getLatitude());
            double dLng = Math.toRadians(lng - gp.getLongitude());
            double distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 6371.0;

            String riskLevel;
            double prob;
            String primaryDriver;

            if (distKm > 40.0 && (lat < 24.5 || lat > 26.5 || lng < 92.0 || lng > 93.5)) {
                riskLevel = "SAFE";
                prob = 0.02;
                primaryDriver = "Lowland Plains / Outside Mountain Hazard Belt";
            } else if (gp.getProbability() != null && gp.getProbability() > 0.0) {
                prob = gp.getProbability();
                riskLevel = gp.getRiskLevel() != null ? gp.getRiskLevel() : "LOW";
                if ("LOW".equalsIgnoreCase(riskLevel)) riskLevel = "SAFE";
                primaryDriver = slope >= 30.0 ? "Escarpment Slope Failure Threat" : "Stable Terrain Horizon";
            } else if (slope >= 30.0) {
                riskLevel = "CRITICAL";
                prob = 0.94;
                primaryDriver = String.format("Extreme Escarpment Shear (%.1f° Slope, %.0fm ASL)", slope, elevation);
            } else if (slope >= 22.0) {
                riskLevel = "HIGH";
                prob = 0.78;
                primaryDriver = String.format("Saturated Hillside Gradient (%.1f° Slope)", slope);
            } else if (slope >= 15.0) {
                riskLevel = "MODERATE";
                prob = 0.38;
                primaryDriver = "Moderate Hill Cut Incline";
            } else {
                riskLevel = "SAFE";
                prob = 0.04;
                primaryDriver = "Stable Lowland Plateau";
            }

            boolean inRisk = "CRITICAL".equalsIgnoreCase(riskLevel) || "HIGH".equalsIgnoreCase(riskLevel);
            String advisory = inRisk
                    ? String.format("🚨 CRITICAL LANDSLIDE DANGER: Extreme destabilization hazard (%.1f%%) predicted near %s.", prob * 100, locationName)
                    : String.format("🛡️ SAFE AREA: No active landslide threat at %s. Stable slope terrain.", locationName);
            String action = inRisk
                    ? "IMMEDIATE EVACUATION: Move away from steep slopes, hill cuttings, and stream beds."
                    : "No emergency action required. Continuous monitoring active.";

            return ResponseEntity.ok(AlertCheckResponseDto.builder()
                    .inRiskZone(inRisk)
                    .riskLevel(riskLevel)
                    .district(gp.getDistrict() != null ? gp.getDistrict() : "Dima Hasao")
                    .locationName(locationName)
                    .distanceMeters(Math.round(distKm * 1000.0 * 10.0) / 10.0)
                    .probability(Math.round(prob * 1000.0) / 1000.0)
                    .advisory(advisory)
                    .actionRequired(action)
                    .primaryHazardDriver(primaryDriver)
                    .evaluatedBy("Spring Boot GIS Geotechnical Engine (Grid Database)")
                    .alertDispatched(inRisk)
                    .checkedAt(LocalDateTime.now())
                    .build());
        }

        // 3. Lowland / default safe response
        return ResponseEntity.ok(AlertCheckResponseDto.builder()
                .inRiskZone(false)
                .riskLevel("SAFE")
                .district("Lowland Region")
                .locationName(locationName)
                .probability(0.02)
                .advisory(String.format("🛡️ SAFE AREA: No active landslide threat at %s.", locationName))
                .actionRequired("No emergency action required.")
                .evaluatedBy("Default Safe Baseline")
                .alertDispatched(false)
                .checkedAt(LocalDateTime.now())
                .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> triggerAssessment() {
        orchestrationService.processDailyPredictions();
        return ResponseEntity.ok(Map.of(
            "status", "Triggered",
            "message", "Landslide early warning pipeline assessment initiated in background."
        ));
    }

    @PostMapping("/reseed")
    public ResponseEntity<Map<String, String>> reseedGrid() {
        dataSeeder.reseedDatabase();
        return ResponseEntity.ok(Map.of(
            "status", "Success",
            "message", "Database successfully reseeded with authentic polygon grid points."
        ));
    }
}
