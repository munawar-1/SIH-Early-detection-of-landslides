package com.sih.landslide.controller;

import com.sih.landslide.dto.AlertCheckResponseDto;
import com.sih.landslide.dto.LocationUpdateDto;
import com.sih.landslide.model.UserMobile;
import com.sih.landslide.service.LocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/location")
@CrossOrigin(origins = "*")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @PostMapping("/update")
    public ResponseEntity<AlertCheckResponseDto> updateLocation(
            Authentication authentication,
            @RequestBody LocationUpdateDto dto) {
        String mobileNumber = authentication != null ? authentication.getName() : "+919876543210";
        AlertCheckResponseDto response = locationService.updateLocation(mobileNumber, dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/consent")
    public ResponseEntity<Map<String, Object>> updateConsent(
            Authentication authentication,
            @RequestParam boolean consent) {
        String mobileNumber = authentication != null ? authentication.getName() : "+919876543210";
        UserMobile user = locationService.toggleLocationConsent(mobileNumber, consent);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "mobile_number", user.getMobileNumber(),
            "location_consent", user.getLocationConsent()
        ));
    }
}
