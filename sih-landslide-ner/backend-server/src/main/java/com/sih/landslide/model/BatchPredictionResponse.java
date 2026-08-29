package com.sih.landslide.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchPredictionResponse {
    private List<PredictionResponse> results;
}
