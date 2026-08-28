package com.sih.landslide.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionRequest {
    private Double latitude;
    private Double longitude;
    private Double slope;
    private Double clayPercent;
    private Double rainfall;
}
