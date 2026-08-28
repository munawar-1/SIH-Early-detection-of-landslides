package com.sih.landslide.controller;

import com.sih.landslide.model.GridPoint;
import com.sih.landslide.model.PredictionResponse;
import com.sih.landslide.repository.GridPointRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    private final GridPointRepository repository;

    public PredictionController(GridPointRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<PredictionResponse> getPredictions() {
        return repository.findAll().stream()
                .filter(point -> point.getRiskLevel() != null)
                .map(point -> new PredictionResponse(
                        point.getLatitude(),
                        point.getLongitude(),
                        point.getRiskLevel()))
                .collect(Collectors.toList());
    }
}
