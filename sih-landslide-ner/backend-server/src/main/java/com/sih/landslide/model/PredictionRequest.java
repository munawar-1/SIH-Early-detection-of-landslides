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
    private Double elevation;
    private Double aspect;

    @JsonProperty("aspect_sin")
    private Double aspectSin;

    @JsonProperty("aspect_cos")
    private Double aspectCos;

    @JsonProperty("clay_percent")
    private Double clayPercent;

    @JsonProperty("sand_percent")
    private Double sandPercent;

    @JsonProperty("silt_percent")
    private Double siltPercent;

    @JsonProperty("bulk_density")
    private Double bulkDensity;

    @JsonProperty("rain_day_minus_3_mm")
    private Double rainDayMinus3Mm;

    @JsonProperty("rain_day_minus_2_mm")
    private Double rainDayMinus2Mm;

    @JsonProperty("rain_day_minus_1_mm")
    private Double rainDayMinus1Mm;

    public PredictionRequest(Double slope, Double clayPercent, Double r3, Double r2, Double r1) {
        this.slope = slope;
        this.clayPercent = clayPercent;
        this.rainDayMinus3Mm = r3;
        this.rainDayMinus2Mm = r2;
        this.rainDayMinus1Mm = r1;
    }
}

