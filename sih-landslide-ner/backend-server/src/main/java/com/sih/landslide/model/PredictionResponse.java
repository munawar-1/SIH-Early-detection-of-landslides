package com.sih.landslide.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {
    private Double latitude;
    private Double longitude;
    private String riskLevel;
}
