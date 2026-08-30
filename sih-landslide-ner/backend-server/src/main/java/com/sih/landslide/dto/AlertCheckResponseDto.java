package com.sih.landslide.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertCheckResponseDto {

    @JsonProperty("in_risk_zone")
    private boolean inRiskZone;

    @JsonProperty("risk_level")
    private String riskLevel; // 'SAFE', 'MODERATE', 'HIGH', 'CRITICAL'

    @JsonProperty("zone_id")
    private Long zoneId;

    private String district;

    @JsonProperty("distance_meters")
    private Double distanceMeters;

    private Double probability;

    private String advisory;

    @JsonProperty("action_required")
    private String actionRequired;

    @JsonProperty("alert_dispatched")
    private boolean alertDispatched;

    @JsonProperty("checked_at")
    @Builder.Default
    private LocalDateTime checkedAt = LocalDateTime.now();
}
