package com.sih.landslide.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "public_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String mediaUrl;

    @Column(nullable = false, length = 20)
    private String mediaType; // "PHOTO" or "VIDEO"

    @Column(nullable = false, length = 50)
    private String category; // "Crack", "Slope Movement", "Blocked Road", "Other"

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(length = 255)
    private String locationName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 30)
    private String uploaderPhone;

    @Column(nullable = false)
    @Builder.Default
    private Boolean verified = false;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime verifiedAt;

    @Column(length = 100)
    private String verifiedBy;
}
