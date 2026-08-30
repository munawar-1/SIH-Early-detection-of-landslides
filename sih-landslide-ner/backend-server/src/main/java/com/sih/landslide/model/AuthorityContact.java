package com.sih.landslide.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "authority_contacts", indexes = {
    @Index(name = "idx_authority_district", columnList = "district")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorityContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "district", nullable = false, length = 100)
    private String district;

    @Column(name = "role", nullable = false, length = 150)
    private String role;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
