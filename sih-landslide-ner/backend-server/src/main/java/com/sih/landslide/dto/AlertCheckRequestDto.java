package com.sih.landslide.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertCheckRequestDto {
    @JsonAlias({"latitude", "lat"})
    private Double lat;

    @JsonAlias({"longitude", "lng", "lon"})
    private Double lng;

    @JsonAlias({"locationName", "location_name", "name"})
    private String locationName;

    @JsonAlias({"rain_day_minus_1_mm", "rainDay1"})
    private Double rainDayMinus1Mm;
}
