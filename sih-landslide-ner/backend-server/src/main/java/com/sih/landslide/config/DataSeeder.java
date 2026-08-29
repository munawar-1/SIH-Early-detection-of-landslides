package com.sih.landslide.config;

import com.sih.landslide.model.GridPoint;
import com.sih.landslide.repository.GridPointRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);
    private final GridPointRepository repository;
    private final com.sih.landslide.service.OrchestrationService orchestrationService;

    public DataSeeder(GridPointRepository repository, com.sih.landslide.service.OrchestrationService orchestrationService) {
        this.repository = repository;
        this.orchestrationService = orchestrationService;
    }

    @Override
    public void run(String... args) {
        long currentCount = repository.count();
        if (currentCount > 0) {
            logger.info("Database already contains {} grid points. Triggering background weather and risk assessment...", currentCount);
            orchestrationService.processDailyPredictions();
            return;
        }

        logger.info("Initializing database: Seeding Dima Hasao static geospatial grid points...");
        String csvResourcePath = "data/Dima-Hasao_grid.csv";

        try {
            ClassPathResource resource = new ClassPathResource(csvResourcePath);
            if (!resource.exists()) {
                logger.warn("Seeding resource not found at classpath: {}", csvResourcePath);
                return;
            }

            List<GridPoint> batch = new ArrayList<>(1000);
            int totalInserted = 0;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String headerLine = reader.readLine(); // skip header: latitude,longitude,elevation,slope,clay_percentage
                String line;

                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    
                    String[] tokens = line.split(",");
                    if (tokens.length >= 5) {
                        try {
                            double lat = Double.parseDouble(tokens[0].trim());
                            double lon = Double.parseDouble(tokens[1].trim());
                            double elevation = Double.parseDouble(tokens[2].trim());
                            double slope = Double.parseDouble(tokens[3].trim());
                            double clayPercent = Double.parseDouble(tokens[4].trim());

                            GridPoint point = new GridPoint();
                            point.setDistrict("Dima Hasao");
                            point.setLatitude(lat);
                            point.setLongitude(lon);
                            point.setElevation(elevation);
                            point.setSlope(slope);
                            point.setClayPercent(clayPercent);
                            point.setRainDay1(0.0);
                            point.setRainDay2(0.0);
                            point.setRainDay3(0.0);
                            point.setProbability(0.0);
                            point.setRiskLevel("LOW");
                            point.setLastUpdated(LocalDateTime.now());

                            batch.add(point);

                            if (batch.size() >= 1000) {
                                repository.saveAll(batch);
                                totalInserted += batch.size();
                                logger.info("Seeded {} grid points into database...", totalInserted);
                                batch.clear();
                            }
                        } catch (NumberFormatException nfe) {
                            logger.warn("Skipping invalid row: {}", line);
                        }
                    }
                }

                if (!batch.isEmpty()) {
                    repository.saveAll(batch);
                    totalInserted += batch.size();
                    batch.clear();
                }
            }

            logger.info("✅ Successfully seeded {} static grid points for Dima Hasao into database!", totalInserted);
            orchestrationService.processDailyPredictions();

        } catch (Exception e) {
            logger.error("❌ Failed to seed grid points into database", e);
        }
    }
}
