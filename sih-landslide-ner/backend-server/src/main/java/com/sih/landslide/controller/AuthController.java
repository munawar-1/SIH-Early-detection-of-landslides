package com.sih.landslide.controller;

import com.sih.landslide.dto.AuthResponseDto;
import com.sih.landslide.dto.RequestOtpDto;
import com.sih.landslide.dto.VerifyOtpDto;
import com.sih.landslide.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/mobile/request-otp")
    public ResponseEntity<Map<String, String>> requestOtp(@RequestBody RequestOtpDto dto) {
        return ResponseEntity.ok(authService.requestOtp(dto));
    }

    @PostMapping("/mobile/verify-otp")
    public ResponseEntity<AuthResponseDto> verifyOtp(@RequestBody VerifyOtpDto dto) {
        return ResponseEntity.ok(authService.verifyOtp(dto));
    }

    @PostMapping("/authority/login")
    public ResponseEntity<AuthResponseDto> authorityLogin(
            @RequestParam(required = false, defaultValue = "+919435001122") String phone,
            @RequestParam(required = false, defaultValue = "Dima Hasao") String district) {
        return ResponseEntity.ok(authService.authorityLogin(phone, district));
    }
}
