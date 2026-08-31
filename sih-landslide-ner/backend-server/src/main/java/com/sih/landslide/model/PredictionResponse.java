package com.sih.landslide.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {
    private Integer prediction;

    @JsonProperty("landslide_probability")
    private Double landslideProbability;

    @JsonProperty("risk_level")
    private String riskLevel;

    @JsonProperty("prediction_horizon")
    private String predictionHorizon;

    public PredictionResponse(Double landslideProbability, String riskLevel) {
        this.prediction = (landslideProbability != null && landslideProbability >= 0.50) ? 1 : 0;
        this.landslideProbability = landslideProbability;
        this.riskLevel = riskLevel;
        this.predictionHorizon = "72h";
    }
}
