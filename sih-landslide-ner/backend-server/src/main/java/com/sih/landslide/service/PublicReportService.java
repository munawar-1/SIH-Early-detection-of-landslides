package com.sih.landslide.service;

import com.sih.landslide.model.PublicReport;
import com.sih.landslide.repository.PublicReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PublicReportService {

    private static final Logger logger = LoggerFactory.getLogger(PublicReportService.class);

    private final PublicReportRepository publicReportRepository;
    private final Path uploadStorageLocation;

    public PublicReportService(PublicReportRepository publicReportRepository) {
        this.publicReportRepository = publicReportRepository;
        this.uploadStorageLocation = Paths.get("uploads", "reports").toAbsolutePath().normalize();
        
        try {
            Files.createDirectories(this.uploadStorageLocation);
            logger.info("📁 Public reports media directory ready at: {}", this.uploadStorageLocation);
        } catch (IOException ex) {
            logger.error("Could not initialize upload storage location", ex);
            throw new RuntimeException("Could not create upload directory", ex);
        }
    }

    @Transactional
    public PublicReport createReport(MultipartFile file,
                                     String category,
                                     Double latitude,
                                     Double longitude,
                                     String locationName,
                                     String description,
                                     String mediaType,
                                     String uploaderPhone) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Photo or Video media file is required");
        }

        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Actual GPS latitude and longitude coordinates are required");
        }

        // 1. Determine media type from mime or file extension if not provided
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "report_media";
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex).toLowerCase();
        } else {
            extension = ".jpg";
        }

        String determinedMediaType = mediaType;
        if (determinedMediaType == null || determinedMediaType.isBlank()) {
            String contentType = file.getContentType();
            if (contentType != null && contentType.startsWith("video/")) {
                determinedMediaType = "VIDEO";
            } else if (extension.matches("\\.(mp4|mov|avi|mkv|webm)")) {
                determinedMediaType = "VIDEO";
            } else {
                determinedMediaType = "PHOTO";
            }
        }

        // 2. Generate unique filename and store file
        String uniqueFilename = UUID.randomUUID().toString() + "_" + System.currentTimeMillis() + extension;
        Path targetLocation = this.uploadStorageLocation.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        String mediaUrl = "/api/public-reports/media/" + uniqueFilename;

        // 3. Fallback location name if not provided
        String resolvedLocation = locationName;
        if (resolvedLocation == null || resolvedLocation.isBlank()) {
            resolvedLocation = String.format("Geo-Point (%.4f, %.4f), Dima Hasao", latitude, longitude);
        }

        String safeCategory = category != null && !category.isBlank() ? category : "Other";

        // 4. Build and persist entity
        PublicReport report = PublicReport.builder()
                .mediaUrl(mediaUrl)
                .mediaType(determinedMediaType.toUpperCase())
                .category(safeCategory)
                .latitude(latitude)
                .longitude(longitude)
                .locationName(resolvedLocation)
                .description(description != null ? description.trim() : "")
                .uploaderPhone(uploaderPhone)
                .verified(false)
                .createdAt(LocalDateTime.now())
                .build();

        PublicReport saved = publicReportRepository.save(report);
        logger.info("✅ Created public report #{}: category='{}', lat={}, lng={}, media={}",
                saved.getId(), saved.getCategory(), saved.getLatitude(), saved.getLongitude(), saved.getMediaUrl());

        return saved;
    }

    @Transactional(readOnly = true)
    public List<PublicReport> getAllReports() {
        return publicReportRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Optional<PublicReport> getReportById(Long id) {
        return publicReportRepository.findById(id);
    }

    @Transactional
    public PublicReport verifyReport(Long id, String verifiedBy) {
        PublicReport report = publicReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found with ID: " + id));

        report.setVerified(true);
        report.setVerifiedAt(LocalDateTime.now());
        report.setVerifiedBy(verifiedBy != null ? verifiedBy : "District Official");

        PublicReport updated = publicReportRepository.save(report);
        logger.info("🛡️ Report #{} has been VERIFIED by '{}'. Database updated.", id, updated.getVerifiedBy());
        return updated;
    }

    public Resource loadMediaAsResource(String filename) {
        try {
            Path filePath = this.uploadStorageLocation.resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Media file not found: " + filename);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Media file path is invalid: " + filename, ex);
        }
    }
}
