package com.sih.landslide.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "alert_log", indexes = {
    @Index(name = "idx_alert_log_user_zone", columnList = "user_id, risk_zone_id, cooldown_expires_at"),
    @Index(name = "idx_alert_log_auth_zone", columnList = "authority_contact_id, risk_zone_id, cooldown_expires_at"),
    @Index(name = "idx_alert_log_sent_at", columnList = "sent_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private UserMobile user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authority_contact_id", nullable = true)
    private AuthorityContact authorityContact;

    @Column(name = "risk_zone_id", nullable = false)
    private Long riskZoneId;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private AlertChannel channel;

    @Column(name = "sent_at", nullable = false)
    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();

    @Column(name = "cooldown_expires_at", nullable = false)
    private LocalDateTime cooldownExpiresAt;

    @PrePersist
    protected void onCreate() {
        if (this.sentAt == null) {
            this.sentAt = LocalDateTime.now();
        }
    }
}
