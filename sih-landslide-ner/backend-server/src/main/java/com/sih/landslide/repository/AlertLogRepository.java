package com.sih.landslide.repository;

import com.sih.landslide.model.AlertLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertLogRepository extends JpaRepository<AlertLog, Long> {

    @Query("SELECT a FROM AlertLog a WHERE a.user.id = :userId AND a.riskZoneId = :riskZoneId AND a.cooldownExpiresAt > :now ORDER BY a.sentAt DESC")
    List<AlertLog> findActiveCooldownForUser(@Param("userId") Long userId, 
                                             @Param("riskZoneId") Long riskZoneId, 
                                             @Param("now") LocalDateTime now);

    @Query("SELECT a FROM AlertLog a WHERE a.authorityContact.id = :authorityContactId AND a.riskZoneId = :riskZoneId AND a.cooldownExpiresAt > :now ORDER BY a.sentAt DESC")
    List<AlertLog> findActiveCooldownForAuthority(@Param("authorityContactId") Long authorityContactId, 
                                                  @Param("riskZoneId") Long riskZoneId, 
                                                  @Param("now") LocalDateTime now);

    List<AlertLog> findByAuthorityContact_DistrictOrderBySentAtDesc(String district);

    List<AlertLog> findAllByOrderBySentAtDesc();

    List<AlertLog> findTop50ByOrderBySentAtDesc();
}
