package com.sih.landslide.controller;

import com.sih.landslide.model.PredictionResponse;
import com.sih.landslide.service.OrchestrationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    private final OrchestrationService orchestrationService;

    public PredictionController(OrchestrationService orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    @GetMapping
    public List<PredictionResponse> getPredictions() {
        return orchestrationService.getPredictions();
    }
}
