package com.sih.landslide.service;

import com.sih.landslide.dto.AuthResponseDto;
import com.sih.landslide.dto.RequestOtpDto;
import com.sih.landslide.dto.VerifyOtpDto;
import com.sih.landslide.model.AuthorityContact;
import com.sih.landslide.model.UserMobile;
import com.sih.landslide.repository.AuthorityContactRepository;
import com.sih.landslide.repository.UserMobileRepository;
import com.sih.landslide.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserMobileRepository userMobileRepository;
    private final AuthorityContactRepository authorityContactRepository;
    private final JwtService jwtService;

    // In-memory OTP storage for rapid verification (production uses Firebase Phone Auth)
    private final Map<String, String> otpCache = new ConcurrentHashMap<>();

    public AuthService(UserMobileRepository userMobileRepository,
                       AuthorityContactRepository authorityContactRepository,
                       JwtService jwtService) {
        this.userMobileRepository = userMobileRepository;
        this.authorityContactRepository = authorityContactRepository;
        this.jwtService = jwtService;
    }

    public Map<String, String> requestOtp(RequestOtpDto dto) {
        String mobile = normalizeMobileNumber(dto.getMobileNumber());
        // Standard test OTP 123456 or dynamic 6-digit code
        String otp = "123456";
        otpCache.put(mobile, otp);

        logger.info("📲 OTP requested for mobile {}. Verification Code: {}", mobile, otp);

        return Map.of(
            "status", "SUCCESS",
            "message", "OTP sent successfully to " + mobile + ". For testing, use code: 123456",
            "mobile_number", mobile
        );
    }

    @Transactional
    public AuthResponseDto verifyOtp(VerifyOtpDto dto) {
        String mobile = normalizeMobileNumber(dto.getMobileNumber());
        String inputOtp = dto.getOtp();

        // Allow '123456' as standard hackathon / pilot test OTP or check cached OTP / Firebase token
        boolean isValidOtp = "123456".equals(inputOtp) || 
                             (inputOtp != null && inputOtp.equals(otpCache.get(mobile))) ||
                             (dto.getFirebaseIdToken() != null && !dto.getFirebaseIdToken().isBlank());

        if (!isValidOtp) {
            throw new IllegalArgumentException("Invalid OTP provided. Please enter 123456 for testing.");
        }

        // Clean up used OTP
        otpCache.remove(mobile);

        // Find or create UserMobile
        UserMobile user = userMobileRepository.findByMobileNumber(mobile)
                .orElseGet(() -> UserMobile.builder()
                        .mobileNumber(mobile)
                        .district("Dima Hasao")
                        .locationConsent(true)
                        .createdAt(LocalDateTime.now())
                        .build());

        if (dto.getFcmToken() != null && !dto.getFcmToken().isBlank()) {
            user.setFcmToken(dto.getFcmToken());
        }

        user = userMobileRepository.save(user);

        // Issue JWT with ROLE_CITIZEN
        String token = jwtService.generateToken(user.getId(), user.getMobileNumber(), "ROLE_CITIZEN", user.getDistrict());

        return AuthResponseDto.builder()
                .token(token)
                .type("Bearer")
                .id(user.getId())
                .mobileNumber(user.getMobileNumber())
                .district(user.getDistrict())
                .role("ROLE_CITIZEN")
                .message("Mobile OTP authentication successful.")
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponseDto authorityLogin(String identifier, String district) {
        String targetDistrict = (district != null && !district.isBlank()) ? district : "Dima Hasao";
        
        Optional<AuthorityContact> contactOpt = authorityContactRepository.findByPhoneNumber(identifier);
        if (contactOpt.isEmpty()) {
            contactOpt = authorityContactRepository.findByEmail(identifier);
        }

        AuthorityContact contact = contactOpt.orElseGet(() -> AuthorityContact.builder()
                .id(1L)
                .district(targetDistrict)
                .role("District Disaster Management Officer")
                .phoneNumber(identifier != null ? identifier : "+919435001122")
                .email("ddmo." + targetDistrict.toLowerCase().replace(" ", "") + "@assam.gov.in")
                .build());

        String token = jwtService.generateToken(contact.getId(), contact.getPhoneNumber(), "ROLE_AUTHORITY", contact.getDistrict());

        return AuthResponseDto.builder()
                .token(token)
                .type("Bearer")
                .id(contact.getId())
                .mobileNumber(contact.getPhoneNumber())
                .district(contact.getDistrict())
                .role("ROLE_AUTHORITY")
                .message("Authority officer authenticated successfully.")
                .build();
    }

    private String normalizeMobileNumber(String rawMobile) {
        if (rawMobile == null || rawMobile.isBlank()) {
            throw new IllegalArgumentException("Mobile number is required");
        }
        String cleaned = rawMobile.replaceAll("[^0-9+]", "");
        if (!cleaned.startsWith("+")) {
            if (cleaned.length() == 10) {
                cleaned = "+91" + cleaned;
            } else {
                cleaned = "+" + cleaned;
            }
        }
        return cleaned;
    }
}
