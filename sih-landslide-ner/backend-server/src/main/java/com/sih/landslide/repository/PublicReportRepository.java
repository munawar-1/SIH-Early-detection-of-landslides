package com.sih.landslide.repository;

import com.sih.landslide.model.PublicReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PublicReportRepository extends JpaRepository<PublicReport, Long> {
    
    List<PublicReport> findAllByOrderByCreatedAtDesc();

    List<PublicReport> findByCategoryOrderByCreatedAtDesc(String category);

    List<PublicReport> findByVerifiedOrderByCreatedAtDesc(Boolean verified);
}
