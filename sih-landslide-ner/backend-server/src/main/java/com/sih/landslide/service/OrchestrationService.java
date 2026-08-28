package com.sih.landslide.service;

import com.sih.landslide.model.GridPoint;
import com.sih.landslide.model.PredictionRequest;
import com.sih.landslide.model.PredictionResponse;
import com.sih.landslide.repository.GridPointRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrchestrationService {

    private final GridPointRepository repository;
    private final WebClient webClient;

    public OrchestrationService(GridPointRepository repository, WebClient.Builder webClientBuilder, 
                                @Value("${ml.service.url:http://localhost:8000}") String mlServiceUrl) {
        this.repository = repository;
        this.webClient = webClientBuilder.baseUrl(mlServiceUrl).build();
    }

    public List<PredictionResponse> getPredictions() {
        // 1. Call repository.findAll()
        List<GridPoint> gridPoints = repository.findAll();

        // 2. Loop through the points to attach today's rainfall (hardcode 45.0mm for testing right now)
        List<PredictionRequest> requests = gridPoints.stream().map(point -> {
            return new PredictionRequest(
                    point.getLatitude(),
                    point.getLongitude(),
                    point.getSlope(),
                    point.getClayPercent(),
                    45.0 // hardcoded rainfall for testing
            );
        }).collect(Collectors.toList());

        // 3. Use Spring WebClient to send the payload to the FastAPI /predict-batch endpoint.
        // Assuming FastAPI returns a list of PredictionResponse
        PredictionResponse[] responses = webClient.post()
                .uri("/predict-batch")
                .bodyValue(requests)
                .retrieve()
                .bodyToMono(PredictionResponse[].class)
                .block(); // Blocking here since we are returning a List, adjust if fully reactive is needed.

        // 4. Return the combined data (Lat, Lon, Risk Level) to the frontend.
        return responses != null ? List.of(responses) : List.of();
    }
}
