package com.sih.landslide.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.concurrent.ConcurrentHashMap;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.Duration;
import com.fasterxml.jackson.databind.JsonNode;

@Service
public class WeatherService {

    public record ForecastRainfall(
        double rainDay1,
        double rainDay2,
        double rainDay3
    ) {}

    private final WebClient webClient;
    // Cache mapped by 10km x 10km grid key (0.1 degree lat/lon) to 3-day ForecastRainfall
    private final ConcurrentHashMap<String, ForecastRainfall> weather10KmGridCache = new ConcurrentHashMap<>();

    public WeatherService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://api.open-meteo.com/v1").build();
    }

    public void clearCache() {
        weather10KmGridCache.clear();
    }

    public static String get10KmGridKey(double lat, double lon) {
        BigDecimal bdLat = BigDecimal.valueOf(lat).setScale(1, RoundingMode.HALF_UP);
        BigDecimal bdLon = BigDecimal.valueOf(lon).setScale(1, RoundingMode.HALF_UP);
        return String.format(Locale.US, "%.1f,%.1f", bdLat.doubleValue(), bdLon.doubleValue());
    }

    public Mono<ForecastRainfall> get10KmForecastRainfall(double lat, double lon) {
        String cacheKey = get10KmGridKey(lat, lon);

        if (weather10KmGridCache.containsKey(cacheKey)) {
            return Mono.just(weather10KmGridCache.get(cacheKey));
        }

        String[] parts = cacheKey.split(",");
        double gridLat = Double.parseDouble(parts[0]);
        double gridLon = Double.parseDouble(parts[1]);

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/forecast")
                        .queryParam("latitude", gridLat)
                        .queryParam("longitude", gridLon)
                        .queryParam("daily", "precipitation_sum")
                        .queryParam("forecast_days", "3")
                        .queryParam("timezone", "auto")
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> {
                    JsonNode precipitationNode = response.path("daily").path("precipitation_sum");
                    double day1 = 0.0, day2 = 0.0, day3 = 0.0;

                    if (precipitationNode.isArray()) {
                        int size = precipitationNode.size();
                        if (size >= 1) day1 = precipitationNode.get(0).asDouble(0.0);
                        if (size >= 2) day2 = precipitationNode.get(1).asDouble(0.0);
                        if (size >= 3) day3 = precipitationNode.get(2).asDouble(0.0);
                    }

                    ForecastRainfall data = new ForecastRainfall(day1, day2, day3);
                    weather10KmGridCache.put(cacheKey, data);
                    return data;
                })
                .delayElement(Duration.ofMillis(100))
                .onErrorResume(e -> {
                    ForecastRainfall fallback = new ForecastRainfall(0.0, 0.0, 0.0);
                    return Mono.just(fallback);
                });
    }

    public Mono<Map<String, ForecastRainfall>> fetchAll10KmGridCells(Set<String> uniqueGridKeys) {
        return Flux.fromIterable(uniqueGridKeys)
                .flatMap(key -> {
                    String[] parts = key.split(",");
                    double gridLat = Double.parseDouble(parts[0]);
                    double gridLon = Double.parseDouble(parts[1]);

                    return get10KmForecastRainfall(gridLat, gridLon)
                            .map(rainfall -> Map.entry(key, rainfall));
                }, 10)
                .collectMap(Map.Entry::getKey, Map.Entry::getValue);
    }
}
