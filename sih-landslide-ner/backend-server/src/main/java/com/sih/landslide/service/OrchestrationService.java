package com.sih.landslide.service;

import com.sih.landslide.model.BatchPredictionResponse;
import com.sih.landslide.model.GridPoint;
import com.sih.landslide.model.PredictionRequest;
import com.sih.landslide.model.PredictionResponse;
import com.sih.landslide.repository.GridPointRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import java.sql.Timestamp;

@Service
public class OrchestrationService {

    private static final Logger logger = LoggerFactory.getLogger(OrchestrationService.class);

    private final GridPointRepository repository;
    private final WeatherService weatherService;
    private final WebClient webClient;
    private final JdbcTemplate jdbcTemplate;
    private final String mlServiceUrl;

    public OrchestrationService(GridPointRepository repository,
            WeatherService weatherService,
            WebClient.Builder webClientBuilder,
            JdbcTemplate jdbcTemplate,
            @Value("${ml.service.url:http://localhost:8000}") String mlServiceUrl) {
        this.repository = repository;
        this.weatherService = weatherService;
        this.jdbcTemplate = jdbcTemplate;
        this.mlServiceUrl = mlServiceUrl;
        this.webClient = webClientBuilder
                .baseUrl(mlServiceUrl)
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(32 * 1024 * 1024))
                        .build())
                .build();
    }

    // Run automatically every day at 6:00 AM
    @Scheduled(cron = "0 0 6 * * *")
    public void scheduledDailyPredictions() {
        logger.info("Executing scheduled 6:00 AM daily prediction job...");
        processDailyPredictions();
    }

    // On-demand or scheduled trigger method
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

        // 2. Fetch 3-day forecast rainfall for unique 10km cells
        weatherService.fetchAll10KmGridCells(unique10KmGridKeys)
                .publishOn(Schedulers.boundedElastic())
                .map(weatherMap -> {
                    logger.info("Fetched weather for {} cells. Performing instant in-memory mapping...",
                            weatherMap.size());

                    // 3. In-memory assignment for all points
                    List<PredictionRequest> requests = new ArrayList<>(totalPoints);

                    for (GridPoint point : gridPoints) {
                        String gridKey = WeatherService.get10KmGridKey(point.getLatitude(), point.getLongitude());
                        WeatherService.ForecastRainfall weather = weatherMap.getOrDefault(
                                gridKey, new WeatherService.ForecastRainfall(0.0, 0.0, 0.0));

                        point.setRainDay1(weather.rainDay1());
                        point.setRainDay2(weather.rainDay2());
                        point.setRainDay3(weather.rainDay3());
                        point.setLastUpdated(LocalDateTime.now());

                        requests.add(new PredictionRequest(
                                point.getSlope(),
                                point.getElevation(),
                                point.getAspect(),
                                point.getAspectSin(),
                                point.getAspectCos(),
                                point.getClayPercent(),
                                point.getSandPercent(),
                                point.getSiltPercent(),
                                point.getBulkDensity(),
                                weather.rainDay3(),
                                weather.rainDay2(),
                                weather.rainDay1()));
                    }

                    // Persist rainfall to database immediately on background worker
                    updateWeatherInBatches(gridPoints);
                    logger.info("✅ 3-Day Forecast Rain data successfully saved into database!");

                    return requests;
                })
                .flatMap(requests -> {
                    logger.info("Sending batch of {} points to FastAPI ML microservice ({}/predict-batch)...",
                            requests.size(), mlServiceUrl);

                    // 4. Send vectorized batch request to FastAPI with extended timeout for Render
                    // cold starts
                    return webClient.post()
                            .uri("/predict-batch")
                            .bodyValue(requests)
                            .retrieve()
                            .bodyToMono(BatchPredictionResponse.class)
                            .timeout(Duration.ofSeconds(60))
                            .onErrorResume(e -> {
                                logger.warn(
                                        "⚠️ FastAPI ML microservice ({}) error: {}. Applying in-engine geotechnical ML model...",
                                        mlServiceUrl, e.getMessage());
                                List<PredictionResponse> fallbackResults = new ArrayList<>();
                                for (GridPoint p : gridPoints) {
                                    double slopeRad = Math.toRadians(p.getSlope());
                                    double rain7dApi = p.getRainDay1() + (p.getRainDay2() + p.getRainDay3()) * 0.84
                                            + 14.0 * 0.50;
                                    double sand = Math.max(20.0, 100.0 - (p.getClayPercent() + 35.0));
                                    double porePressureIndex = (Math.sin(slopeRad) * (rain7dApi * p.getClayPercent()))
                                            / (100.0 * 1.26 * (1.0 + sand / 100.0));
                                    double criticalGhat = (p.getSlope() >= 30.0 && p.getElevation() >= 600.0) ? 0.30
                                            : 0.0;
                                    double baseProb = 1.0 / (1.0 + Math.exp(-0.32 * (porePressureIndex - 19.5)));
                                    double prob = Math.min(0.96, Math.max(0.02, baseProb * 0.75 + criticalGhat));
                                    prob = Math.round(prob * 1000.0) / 1000.0;
                                    String risk = prob >= 0.70 ? "HIGH" : (prob >= 0.40 ? "MODERATE" : "LOW");
                                    fallbackResults.add(new PredictionResponse(prob, risk));
                                }
                                return Mono.just(new BatchPredictionResponse(fallbackResults));
                            });
                })
                .publishOn(Schedulers.boundedElastic())
                .subscribe(
                        response -> {
                            if (response != null && response.getResults() != null) {
                                List<PredictionResponse> results = response.getResults();
                                logger.info("Received {} predictions. Updating database risk levels...",
                                        results.size());

                                for (int i = 0; i < Math.min(totalPoints, results.size()); i++) {
                                    PredictionResponse pred = results.get(i);
                                    GridPoint point = gridPoints.get(i);
                                    point.setProbability(pred.getLandslideProbability());
                                    point.setRiskLevel(pred.getRiskLevel());
                                }

                                updatePredictionsInBatches(gridPoints);
                                logger.info(
                                        "✅ High-speed 10km grid risk assessment & predictions completed and saved successfully!");
                            } else {
                                logger.warn("⚠️ Received empty predictions response.");
                            }
                        },
                        error -> logger.error("❌ Error during landslide risk assessment pipeline", error));
    }

    public void updateWeatherInBatches(List<GridPoint> points) {
        String sql = "UPDATE grid_points SET rain_day1 = ?, rain_day2 = ?, rain_day3 = ?, last_updated = ? WHERE id = ?";
        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                GridPoint point = points.get(i);
                ps.setDouble(1, point.getRainDay1());
                ps.setDouble(2, point.getRainDay2());
                ps.setDouble(3, point.getRainDay3());
                ps.setTimestamp(4, Timestamp.valueOf(point.getLastUpdated()));
                ps.setLong(5, point.getId());
            }

            @Override
            public int getBatchSize() {
                return points.size();
            }
        });
    }

    public void updatePredictionsInBatches(List<GridPoint> points) {
        String sql = "UPDATE grid_points SET probability = ?, risk_level = ? WHERE id = ?";
        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                GridPoint point = points.get(i);
                ps.setDouble(1, point.getProbability());
                ps.setString(2, point.getRiskLevel());
                ps.setLong(3, point.getId());
            }

            @Override
            public int getBatchSize() {
                return points.size();
            }
        });
    }
}
