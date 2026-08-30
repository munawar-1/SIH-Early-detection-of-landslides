package com.sih.landslide.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpDto {
    @JsonProperty("mobile_number")
    private String mobileNumber;

    @JsonProperty("otp")
    private String otp;

    @JsonProperty("firebase_id_token")
    private String firebaseIdToken;

    @JsonProperty("fcm_token")
    private String fcmToken;
}
