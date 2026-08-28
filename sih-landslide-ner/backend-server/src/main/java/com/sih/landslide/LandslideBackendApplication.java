package com.sih.landslide;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LandslideBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(LandslideBackendApplication.class, args);
    }
}
