package com.sih.landslide.service;

import com.sih.landslide.model.GridPoint;
import com.sih.landslide.model.PredictionRequest;
import com.sih.landslide.model.PredictionResponse;
import com.sih.landslide.repository.GridPointRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrchestrationService {

    private static final Logger logger = LoggerFactory.getLogger(OrchestrationService.class);

    private final GridPointRepository repository;
    private final WeatherService weatherService;
    private final WebClient webClient;

    public OrchestrationService(GridPointRepository repository, 
                                WeatherService weatherService,
                                WebClient.Builder webClientBuilder, 
                                @Value("${ml.service.url:http://localhost:8000}") String mlServiceUrl) {
        this.repository = repository;
        this.weatherService = weatherService;
        this.webClient = webClientBuilder.baseUrl(mlServiceUrl).build();
    }

    // Run every day at 6:00 AM
    @Scheduled(cron = "0 0 6 * * *")
    public void processDailyPredictions() {
        logger.info("Starting daily prediction background job...");
        
        // Clear yesterday's cache
        weatherService.clearCache();
        
        List<GridPoint> gridPoints = repository.findAll();
        
        if (gridPoints.isEmpty()) {
            logger.info("No grid points found to process.");
            return;
        }

        logger.info("Found {} grid points. Fetching weather and calculating predictions...", gridPoints.size());

        // Process reactively to handle async weather fetching
        Flux.fromIterable(gridPoints)
            .flatMap(point -> weatherService.getPrecipitation(point.getLatitude(), point.getLongitude())
                    .map(rainfall -> {
                        point.setRainfall(rainfall); // Update entity with actual rainfall
                        return new PredictionRequest(
                            point.getLatitude(),
                            point.getLongitude(),
                            point.getSlope(),
                            point.getClayPercent(),
                            rainfall
                        );
                    }), 
            10) // Concurrency limit of 10 to not overwhelm APIs
            .collectList()
            .flatMap(requests -> {
                logger.info("Weather fetched for all points. Sending batch request to ML service...");
                // Send all requests to FastAPI
                return webClient.post()
                        .uri("/predict-batch")
                        .bodyValue(requests)
                        .retrieve()
                        .bodyToFlux(PredictionResponse.class)
                        .collectList();
            })
            .subscribe(
                responses -> {
                    logger.info("Received {} responses from ML Service. Updating database...", responses.size());
                    // Create a lookup for quick updating
                    var responseMap = responses.stream()
                        .collect(Collectors.toMap(
                            r -> r.getLatitude() + "," + r.getLongitude(),
                            r -> r.getRiskLevel()
                        ));

                    // Update grid points with risk level
                    for (GridPoint point : gridPoints) {
                        String key = point.getLatitude() + "," + point.getLongitude();
                        if (responseMap.containsKey(key)) {
                            point.setRiskLevel(responseMap.get(key));
                        }
                    }
                    
                    repository.saveAll(gridPoints);
                    logger.info("Daily prediction background job completed successfully!");
                },
                error -> logger.error("Error during daily prediction job", error)
            );
    }
}
