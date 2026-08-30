package com.sih.landslide.controller;

import com.sih.landslide.model.GridPoint;
import com.sih.landslide.repository.GridPointRepository;
import com.sih.landslide.service.OrchestrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/predictions")
@CrossOrigin(origins = "*")
public class PredictionController {

    private final GridPointRepository repository;
    private final OrchestrationService orchestrationService;
    private final com.sih.landslide.config.DataSeeder dataSeeder;

    public PredictionController(GridPointRepository repository, 
                                OrchestrationService orchestrationService,
                                com.sih.landslide.config.DataSeeder dataSeeder) {
        this.repository = repository;
        this.orchestrationService = orchestrationService;
        this.dataSeeder = dataSeeder;
    }

    @GetMapping
    public List<GridPoint> getPredictions(@RequestParam(required = false, defaultValue = "Dima Hasao") String district) {
        return repository.findAll();
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

