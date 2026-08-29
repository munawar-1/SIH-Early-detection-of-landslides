package com.sih.landslide.service;

import com.sih.landslide.model.BatchPredictionResponse;
import com.sih.landslide.model.GridPoint;
import com.sih.landslide.model.PredictionRequest;
import com.sih.landslide.model.PredictionResponse;
import com.sih.landslide.repository.GridPointRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    // Run automatically every day at 6:00 AM
    @Scheduled(cron = "0 0 6 * * *")
    public void scheduledDailyPredictions() {
        logger.info("Executing scheduled 6:00 AM daily prediction job...");
        processDailyPredictions();
    }

    // On-demand trigger method
    public void processDailyPredictions() {
        logger.info("Starting high-speed 10km grid landslide early warning assessment...");
        
        weatherService.clearCache();
        List<GridPoint> gridPoints = repository.findAll();
        
        if (gridPoints.isEmpty()) {
            logger.info("No grid points found in database to process.");
            return;
        }

        int totalPoints = gridPoints.size();

        // 1. Extract the unique 10km x 10km grid keys across the entire region
        Set<String> unique10KmGridKeys = gridPoints.stream()
                .map(point -> WeatherService.get10KmGridKey(point.getLatitude(), point.getLongitude()))
                .collect(Collectors.toSet());

        logger.info("Partitioned {} terrain points into {} unique 10km atmospheric grid cells.", 
                totalPoints, unique10KmGridKeys.size());

        // 2. Fetch 3-day forecast rainfall only for the unique 10km atmospheric cells concurrently
        weatherService.fetchAll10KmGridCells(unique10KmGridKeys)
            .flatMap(weatherMap -> {
                logger.info("Fetched weather for all {} cells. Performing instant in-memory mapping...", weatherMap.size());

                // 3. Instant O(1) in-memory assignment for all 10,000 points
                List<PredictionRequest> requests = new ArrayList<>(totalPoints);

                for (GridPoint point : gridPoints) {
                    String gridKey = WeatherService.get10KmGridKey(point.getLatitude(), point.getLongitude());
                    WeatherService.ForecastRainfall weather = weatherMap.getOrDefault(
                        gridKey, new WeatherService.ForecastRainfall(0.0, 0.0, 0.0)
                    );

                    point.setRainDay1(weather.rainDay1());
                    point.setRainDay2(weather.rainDay2());
                    point.setRainDay3(weather.rainDay3());
                    point.setLastUpdated(LocalDateTime.now());

                    requests.add(new PredictionRequest(
                        point.getSlope(),
                        point.getClayPercent(),
                        weather.rainDay1(),
                        weather.rainDay2(),
                        weather.rainDay3()
                    ));
                }

                logger.info("Sending batch of {} points to FastAPI ML microservice...", requests.size());

                // 4. Send vectorized batch request to FastAPI
                return webClient.post()
                        .uri("/predict-batch")
                        .bodyValue(requests)
                        .retrieve()
                        .bodyToMono(BatchPredictionResponse.class);
            })
            .subscribe(
                response -> {
                    if (response != null && response.getResults() != null) {
                        List<PredictionResponse> results = response.getResults();
                        logger.info("Received {} predictions from ML service. Updating database...", results.size());

                        for (int i = 0; i < Math.min(totalPoints, results.size()); i++) {
                            PredictionResponse pred = results.get(i);
                            GridPoint point = gridPoints.get(i);
                            point.setProbability(pred.getLandslideProbability());
                            point.setRiskLevel(pred.getRiskLevel());
                        }

                        repository.saveAll(gridPoints);
                        logger.info("✅ High-speed 10km grid risk assessment completed and saved successfully!");
                    }
                },
                error -> logger.error("❌ Error during landslide risk assessment pipeline", error)
            );
    }
}




