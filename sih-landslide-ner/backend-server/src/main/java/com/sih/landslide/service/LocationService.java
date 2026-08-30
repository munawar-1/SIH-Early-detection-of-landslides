package com.sih.landslide.service;

import com.sih.landslide.dto.AlertCheckResponseDto;
import com.sih.landslide.dto.LocationUpdateDto;
import com.sih.landslide.model.UserMobile;
import com.sih.landslide.repository.UserMobileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class LocationService {

    private static final Logger logger = LoggerFactory.getLogger(LocationService.class);

    private final UserMobileRepository userMobileRepository;
    private final AlertDispatchService alertDispatchService;

    public LocationService(UserMobileRepository userMobileRepository,
                           AlertDispatchService alertDispatchService) {
        this.userMobileRepository = userMobileRepository;
        this.alertDispatchService = alertDispatchService;
    }

    @Transactional
    public AlertCheckResponseDto updateLocation(String mobileNumber, LocationUpdateDto dto) {
        UserMobile user = userMobileRepository.findByMobileNumber(mobileNumber)
                .orElseGet(() -> UserMobile.builder()
                        .mobileNumber(mobileNumber)
                        .district("Dima Hasao")
                        .locationConsent(true)
                        .createdAt(LocalDateTime.now())
                        .build());

        user.setLatitude(dto.getLat());
        user.setLongitude(dto.getLng());
        user.setLastLocationAt(LocalDateTime.now());
        
        if (dto.getFcmToken() != null && !dto.getFcmToken().isBlank()) {
            user.setFcmToken(dto.getFcmToken());
        }

        userMobileRepository.save(user);

        logger.info("📍 Location updated for user {} -> Lat: {}, Lng: {}", mobileNumber, dto.getLat(), dto.getLng());

        // Perform automatic spatial check and alert dispatch
        return alertDispatchService.checkAndDispatch(user, dto.getLat(), dto.getLng());
    }

    @Transactional
    public UserMobile toggleLocationConsent(String mobileNumber, boolean consent) {
        UserMobile user = userMobileRepository.findByMobileNumber(mobileNumber)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + mobileNumber));

        user.setLocationConsent(consent);
        return userMobileRepository.save(user);
    }
}
