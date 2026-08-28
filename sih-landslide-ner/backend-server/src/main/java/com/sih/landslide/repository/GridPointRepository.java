package com.sih.landslide.repository;

import com.sih.landslide.model.GridPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GridPointRepository extends JpaRepository<GridPoint, Long> {
}
