package com.sih.landslide.repository;

import com.sih.landslide.model.AuthorityContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuthorityContactRepository extends JpaRepository<AuthorityContact, Long> {
    List<AuthorityContact> findByDistrict(String district);
    Optional<AuthorityContact> findByPhoneNumber(String phoneNumber);
    Optional<AuthorityContact> findByEmail(String email);
}
