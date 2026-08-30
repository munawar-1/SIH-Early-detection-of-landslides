package com.sih.landslide.config;

import com.sih.landslide.model.AuthorityContact;
import com.sih.landslide.model.GridPoint;
import com.sih.landslide.model.RiskZone;
import com.sih.landslide.repository.AuthorityContactRepository;
import com.sih.landslide.repository.GridPointRepository;
import com.sih.landslide.repository.RiskZoneRepository;
import com.sih.landslide.service.OrchestrationService;
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
    private final RiskZoneRepository riskZoneRepository;
    private final AuthorityContactRepository authorityContactRepository;
    private final OrchestrationService orchestrationService;

    public DataSeeder(GridPointRepository repository,
                      RiskZoneRepository riskZoneRepository,
                      AuthorityContactRepository authorityContactRepository,
                      OrchestrationService orchestrationService) {
        this.repository = repository;
        this.riskZoneRepository = riskZoneRepository;
        this.authorityContactRepository = authorityContactRepository;
        this.orchestrationService = orchestrationService;
    }

    @Override
    public void run(String... args) {
        seedAuthorityContactsIfEmpty();

        long currentCount = repository.count();
        long riskZoneCount = riskZoneRepository.count();

        if (currentCount == 5076 && riskZoneCount > 0) {
            logger.info("Database contains exact 5,076 authentic Dima Hasao grid points & {} risk zones. Triggering live prediction pipeline...", riskZoneCount);
            orchestrationService.processDailyPredictions();
            syncRiskZonesFromGridPoints();
            return;
        }

        logger.info("Database contains {} points (expected 5,076 authentic points). Re-seeding database fresh...", currentCount);
        reseedDatabase();
    }

    public synchronized void reseedDatabase() {
        logger.info("Initializing database: Seeding Dima Hasao static geospatial grid points from classpath...");
        String csvResourcePath = "data/Dima-Hasao_grid.csv";

        try {
            ClassPathResource resource = new ClassPathResource(csvResourcePath);
            if (!resource.exists()) {
                logger.warn("Seeding resource not found at classpath: {}", csvResourcePath);
                return;
            }

            repository.deleteAllInBatch();
            riskZoneRepository.deleteAllInBatch();

            List<GridPoint> batch = new ArrayList<>(1000);
            List<RiskZone> rzBatch = new ArrayList<>(1000);
            int totalInserted = 0;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String headerLine = reader.readLine(); // skip header
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

                            if (tokens.length >= 13) {
                                point.setAspect(Double.parseDouble(tokens[5].trim()));
                                point.setAspectSin(Double.parseDouble(tokens[6].trim()));
                                point.setAspectCos(Double.parseDouble(tokens[7].trim()));
                                point.setSandPercent(Double.parseDouble(tokens[9].trim()));
                                point.setSiltPercent(Double.parseDouble(tokens[10].trim()));
                                point.setBulkDensity(Double.parseDouble(tokens[11].trim()));
                                point.setShearStressFactor(Double.parseDouble(tokens[12].trim()));
                            }

                            point.setRainDay1(0.0);
                            point.setRainDay2(0.0);
                            point.setRainDay3(0.0);
                            point.setProbability(0.0);
                            point.setRiskLevel("LOW");
                            point.setLastUpdated(LocalDateTime.now());

                            batch.add(point);

                            RiskZone rz = RiskZone.builder()
                                    .district("Dima Hasao")
                                    .latitude(lat)
                                    .longitude(lon)
                                    .elevation(elevation)
                                    .slope(slope)
                                    .clayPercent(clayPercent)
                                    .rainDay1(0.0)
                                    .rainDay2(0.0)
                                    .rainDay3(0.0)
                                    .probability(0.0)
                                    .riskLevel("LOW")
                                    .lastUpdated(LocalDateTime.now())
                                    .build();
                            rzBatch.add(rz);

                            if (batch.size() >= 1000) {
                                repository.saveAll(batch);
                                riskZoneRepository.saveAll(rzBatch);
                                totalInserted += batch.size();
                                logger.info("Seeded {} grid points & risk zones into database...", totalInserted);
                                batch.clear();
                                rzBatch.clear();
                            }
                        } catch (NumberFormatException nfe) {
                            logger.warn("Skipping invalid row: {}", line);
                        }
                    }
                }

                if (!batch.isEmpty()) {
                    repository.saveAll(batch);
                    riskZoneRepository.saveAll(rzBatch);
                    totalInserted += batch.size();
                    batch.clear();
                    rzBatch.clear();
                }
            }

            logger.info("✅ Successfully seeded {} static grid points & risk zones for Dima Hasao into database!", totalInserted);
            orchestrationService.processDailyPredictions();
            syncRiskZonesFromGridPoints();

        } catch (Exception e) {
            logger.error("❌ Failed to seed grid points into database", e);
        }
    }

    public synchronized void syncRiskZonesFromGridPoints() {
        List<GridPoint> points = repository.findAll();
        if (points.isEmpty()) return;

        List<RiskZone> existingZones = riskZoneRepository.findAll();
        if (existingZones.isEmpty()) {
            List<RiskZone> newZones = points.stream().map(p -> RiskZone.builder()
                    .id(p.getId())
                    .district(p.getDistrict())
                    .latitude(p.getLatitude())
                    .longitude(p.getLongitude())
                    .elevation(p.getElevation())
                    .slope(p.getSlope())
                    .clayPercent(p.getClayPercent())
                    .rainDay1(p.getRainDay1())
                    .rainDay2(p.getRainDay2())
                    .rainDay3(p.getRainDay3())
                    .probability(p.getProbability())
                    .riskLevel(p.getRiskLevel())
                    .lastUpdated(p.getLastUpdated())
                    .build()).toList();
            riskZoneRepository.saveAll(newZones);
        } else {
            // Ensure high risk points exist in risk_zones
            for (GridPoint p : points) {
                if ("HIGH".equalsIgnoreCase(p.getRiskLevel()) || "CRITICAL".equalsIgnoreCase(p.getRiskLevel())) {
                    RiskZone rz = riskZoneRepository.findById(p.getId()).orElseGet(() -> 
                        RiskZone.builder()
                            .district(p.getDistrict())
                            .latitude(p.getLatitude())
                            .longitude(p.getLongitude())
                            .elevation(p.getElevation())
                            .slope(p.getSlope())
                            .clayPercent(p.getClayPercent())
                            .build()
                    );
                    rz.setProbability(p.getProbability());
                    rz.setRiskLevel(p.getRiskLevel());
                    rz.setLastUpdated(LocalDateTime.now());
                    riskZoneRepository.save(rz);
                }
            }
        }
    }

    private void seedAuthorityContactsIfEmpty() {
        if (authorityContactRepository.count() == 0) {
            List<AuthorityContact> contacts = List.of(
                AuthorityContact.builder()
                    .district("Dima Hasao")
                    .role("District Disaster Management Officer (DDMO)")
                    .phoneNumber("+919435001122")
                    .email("ddmo.dimahasao@assam.gov.in")
                    .createdAt(LocalDateTime.now())
                    .build(),
                AuthorityContact.builder()
                    .district("Dima Hasao")
                    .role("Field Officer, ASDMA Haflong")
                    .phoneNumber("+919435003344")
                    .email("asdma.haflong@assam.gov.in")
                    .createdAt(LocalDateTime.now())
                    .build(),
                AuthorityContact.builder()
                    .district("Dima Hasao")
                    .role("NFR Railway Safety Superintendent")
                    .phoneNumber("+919435005566")
                    .email("nfr.safety.haflong@nfr.railnet.gov.in")
                    .createdAt(LocalDateTime.now())
                    .build()
            );
            authorityContactRepository.saveAll(contacts);
            logger.info("✅ Seeded pilot authority contacts for Dima Hasao district.");
        }
    }
}
