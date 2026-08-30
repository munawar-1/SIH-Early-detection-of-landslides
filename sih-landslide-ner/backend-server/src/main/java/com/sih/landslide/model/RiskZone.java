package com.sih.landslide.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "risk_zones", indexes = {
    @Index(name = "idx_rz_lat_lon", columnList = "latitude, longitude"),
    @Index(name = "idx_rz_district", columnList = "district"),
    @Index(name = "idx_rz_risk_level", columnList = "risk_level")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    @Builder.Default
    private String district = "Dima Hasao";

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column
    private Double elevation;

    @Column(name = "slope", nullable = false)
    private Double slope;

    @Column(name = "clay_percent", nullable = false)
    private Double clayPercent;

    @Column(name = "rain_day1")
    @Builder.Default
    private Double rainDay1 = 0.0;

    @Column(name = "rain_day2")
    @Builder.Default
    private Double rainDay2 = 0.0;

    @Column(name = "rain_day3")
    @Builder.Default
    private Double rainDay3 = 0.0;

    @Column(name = "probability")
    @Builder.Default
    private Double probability = 0.0;

    @Column(name = "risk_level", length = 50)
    @Builder.Default
    private String riskLevel = "LOW";

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
}
