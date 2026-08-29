package com.sih.landslide.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "grid_points", indexes = {
    @Index(name = "idx_lat_lon", columnList = "latitude, longitude"),
    @Index(name = "idx_district", columnList = "district"),
    @Index(name = "idx_risk_level", columnList = "riskLevel")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GridPoint {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String district = "Dima Hasao";

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column
    private Double elevation;

    @Column(nullable = false)
    private Double slope;

    @Column(nullable = false)
    private Double clayPercent;

    // Next 3 Days Forecast Rainfall (mm)
    @Column
    private Double rainDay1 = 0.0;

    @Column
    private Double rainDay2 = 0.0;

    @Column
    private Double rainDay3 = 0.0;

    // Predicted Early Warning Hazard Risk
    @Column
    private Double probability = 0.0;

    @Column
    private String riskLevel = "LOW";

    @Column
    private LocalDateTime lastUpdated;
}


