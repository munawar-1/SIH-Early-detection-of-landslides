package com.sih.landslide.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users_mobile", indexes = {
    @Index(name = "idx_mobile_number", columnList = "mobile_number"),
    @Index(name = "idx_firebase_uid", columnList = "firebase_uid")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMobile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mobile_number", nullable = false, unique = true, length = 20)
    private String mobileNumber;

    @Column(name = "firebase_uid", length = 128)
    private String firebaseUid;

    @Column(name = "district", length = 100)
    @Builder.Default
    private String district = "Dima Hasao";

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

    @Column(name = "location_consent", nullable = false)
    @Builder.Default
    private Boolean locationConsent = true;

    @Column(name = "fcm_token", columnDefinition = "TEXT")
    private String fcmToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.locationConsent == null) {
            this.locationConsent = true;
        }
        if (this.district == null) {
            this.district = "Dima Hasao";
        }
    }
}
