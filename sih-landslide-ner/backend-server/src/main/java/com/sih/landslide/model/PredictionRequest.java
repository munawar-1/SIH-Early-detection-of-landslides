package com.sih.landslide.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionRequest {
    private Double slope;

    @JsonProperty("clay_percent")
    private Double clayPercent;

    @JsonProperty("rain_day_minus_3_mm")
    private Double rainDayMinus3Mm;

    @JsonProperty("rain_day_minus_2_mm")
    private Double rainDayMinus2Mm;

    @JsonProperty("rain_day_minus_1_mm")
    private Double rainDayMinus1Mm;
}

