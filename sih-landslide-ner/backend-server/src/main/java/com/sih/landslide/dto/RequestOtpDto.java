package com.sih.landslide.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestOtpDto {
    @JsonProperty("mobile_number")
    private String mobileNumber;
}
