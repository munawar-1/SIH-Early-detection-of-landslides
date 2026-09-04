package com.sih.landslide.repository;

import com.sih.landslide.model.GridPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GridPointRepository extends JpaRepository<GridPoint, Long> {

    @Query(value = """
        SELECT * FROM grid_points g
        ORDER BY (
            (g.latitude - :lat) * (g.latitude - :lat) + 
            (g.longitude - :lng) * (g.longitude - :lng)
        ) ASC
        LIMIT 1
        """, nativeQuery = true)
    Optional<GridPoint> findNearestGridPoint(@Param("lat") double lat, @Param("lng") double lng);
}

