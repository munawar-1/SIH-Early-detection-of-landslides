package com.sih.landslide.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationUpdateDto {
    private Double lat;
    private Double lng;

    @JsonProperty("fcm_token")
    private String fcmToken;
}
