package com.sih.landslide.repository;

import com.sih.landslide.model.UserMobile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserMobileRepository extends JpaRepository<UserMobile, Long> {
    Optional<UserMobile> findByMobileNumber(String mobileNumber);
    Optional<UserMobile> findByFirebaseUid(String firebaseUid);
}
