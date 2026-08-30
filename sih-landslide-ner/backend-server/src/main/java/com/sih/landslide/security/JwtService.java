package com.sih.landslide.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    // Default secret for development / hackathon environment
    private static final String DEFAULT_SECRET = "NERLandslideEarlyWarningSystemSecretKeySIH2026NorthEastIndiaSecurityToken987654321";
    
    // 30 days expiration in milliseconds
    private static final long EXPIRATION_MS = 30L * 24 * 60 * 60 * 1000;

    private final Key key;

    public JwtService(@Value("${jwt.secret:" + DEFAULT_SECRET + "}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(Long userId, String mobileNumber, String role, String district) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("mobileNumber", mobileNumber);
        claims.put("role", role);
        claims.put("district", district != null ? district : "Dima Hasao");

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(mobileNumber)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            logger.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public Long extractUserId(String token) {
        Claims claims = extractClaims(token);
        Object userIdObj = claims.get("userId");
        if (userIdObj instanceof Number) {
            return ((Number) userIdObj).longValue();
        }
        return null;
    }

    public String extractMobileNumber(String token) {
        return extractClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return (String) extractClaims(token).get("role");
    }

    public String extractDistrict(String token) {
        return (String) extractClaims(token).get("district");
    }
}
