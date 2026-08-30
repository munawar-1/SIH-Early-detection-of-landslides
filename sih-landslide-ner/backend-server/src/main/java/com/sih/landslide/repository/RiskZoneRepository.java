package com.sih.landslide.repository;

import com.sih.landslide.model.RiskZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskZoneRepository extends JpaRepository<RiskZone, Long> {

    List<RiskZone> findByDistrict(String district);

    List<RiskZone> findByRiskLevelIn(List<String> riskLevels);

    /**
     * Finds risk zones within buffer distance using Haversine spherical distance calculation (meters).
     */
    @Query(value = """
        SELECT * FROM risk_zones r
        WHERE r.risk_level IN ('HIGH', 'CRITICAL')
          AND (
            6371000 * acos(
              LEAST(1.0, GREATEST(-1.0, 
                cos(radians(:lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(:lng)) + 
                sin(radians(:lat)) * sin(radians(r.latitude))
              ))
            )
          ) <= :bufferMeters
        ORDER BY (
            6371000 * acos(
              LEAST(1.0, GREATEST(-1.0, 
                cos(radians(:lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(:lng)) + 
                sin(radians(:lat)) * sin(radians(r.latitude))
              ))
            )
        ) ASC
        LIMIT 10
        """, nativeQuery = true)
    List<RiskZone> findNearbyDangerousZones(
        @Param("lat") double lat, 
        @Param("lng") double lng, 
        @Param("bufferMeters") double bufferMeters
    );

    /**
     * Checks if a point is within any CRITICAL zone (default buffer 2000m) or HIGH zone (default buffer 500m).
     */
    @Query(value = """
        SELECT * FROM risk_zones r
        WHERE (
            (r.risk_level = 'CRITICAL' AND (
                6371000 * acos(
                  LEAST(1.0, GREATEST(-1.0, 
                    cos(radians(:lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(:lng)) + 
                    sin(radians(:lat)) * sin(radians(r.latitude))
                  ))
                ) <= :criticalBufferMeters
            ))
            OR
            (r.risk_level = 'HIGH' AND (
                6371000 * acos(
                  LEAST(1.0, GREATEST(-1.0, 
                    cos(radians(:lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(:lng)) + 
                    sin(radians(:lat)) * sin(radians(r.latitude))
                  ))
                ) <= :highBufferMeters
            ))
        )
        ORDER BY r.probability DESC, (
            6371000 * acos(
              LEAST(1.0, GREATEST(-1.0, 
                cos(radians(:lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(:lng)) + 
                sin(radians(:lat)) * sin(radians(r.latitude))
              ))
            )
        ) ASC
        LIMIT 5
        """, nativeQuery = true)
    List<RiskZone> findHazardMatch(
        @Param("lat") double lat, 
        @Param("lng") double lng, 
        @Param("highBufferMeters") double highBufferMeters,
        @Param("criticalBufferMeters") double criticalBufferMeters
    );
}
