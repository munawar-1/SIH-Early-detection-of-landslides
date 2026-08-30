package com.sih.landslide.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponseDto {
    private String token;
    
    @Builder.Default
    private String type = "Bearer";

    private Long id;

    @JsonProperty("mobile_number")
    private String mobileNumber;

    private String district;

    private String role;

    private String message;
}
