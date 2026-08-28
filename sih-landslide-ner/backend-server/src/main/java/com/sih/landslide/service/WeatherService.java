package com.sih.landslide.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.concurrent.ConcurrentHashMap;
import java.math.BigDecimal;
import java.math.RoundingMode;
import reactor.core.publisher.Mono;
import java.time.Duration;
import com.fasterxml.jackson.databind.JsonNode;

@Service
public class WeatherService {

    private final WebClient webClient;
    // Cache mapped by rounded lat/lon string to precipitation value
    private final ConcurrentHashMap<String, Double> precipitationCache = new ConcurrentHashMap<>();

    public WeatherService(WebClient.Builder webClientBuilder) {
        // Open-Meteo endpoint
        this.webClient = webClientBuilder.baseUrl("https://api.open-meteo.com/v1").build();
    }

    public void clearCache() {
        precipitationCache.clear();
    }

    public Mono<Double> getPrecipitation(double lat, double lon) {
        // Round to 2 decimal places for cache key (approx 1.1km resolution)
        double roundedLat = roundToTwoDecimals(lat);
        double roundedLon = roundToTwoDecimals(lon);
        String cacheKey = roundedLat + "," + roundedLon;

        if (precipitationCache.containsKey(cacheKey)) {
            return Mono.just(precipitationCache.get(cacheKey));
        }

        // Delay to prevent hitting open-meteo rate limit too fast for un-cached requests
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/forecast")
                        .queryParam("latitude", roundedLat)
                        .queryParam("longitude", roundedLon)
                        .queryParam("daily", "precipitation_sum")
                        .queryParam("timezone", "auto")
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> {
                    JsonNode dailyNode = response.path("daily");
                    JsonNode precipitationNode = dailyNode.path("precipitation_sum");
                    // Get today's precipitation (index 0)
                    double precip = 0.0;
                    if (precipitationNode.isArray() && !precipitationNode.isEmpty()) {
                        precip = precipitationNode.get(0).asDouble(0.0);
                    }
                    precipitationCache.put(cacheKey, precip);
                    return precip;
                })
                .delayElement(Duration.ofMillis(200)) // Artificial delay to avoid rate limit
                .onErrorResume(e -> {
                    // Fallback to a default if API fails
                    return Mono.just(0.0);
                });
    }

    private double roundToTwoDecimals(double value) {
        BigDecimal bd = BigDecimal.valueOf(value);
        bd = bd.setScale(2, RoundingMode.HALF_UP);
        return bd.doubleValue();
    }
}
