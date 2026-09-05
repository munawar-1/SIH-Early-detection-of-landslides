package com.sih.landslide.controller;

import com.sih.landslide.model.PublicReport;
import com.sih.landslide.service.PublicReportService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public-reports")
@CrossOrigin(origins = "*")
public class PublicReportController {

    private static final Logger logger = LoggerFactory.getLogger(PublicReportController.class);

    private final PublicReportService publicReportService;

    public PublicReportController(PublicReportService publicReportService) {
        this.publicReportService = publicReportService;
    }

    /**
     * Submit a geo-tagged citizen observation report with photo/video.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitReport(
            @RequestParam("file") MultipartFile file,
            @RequestParam("category") String category,
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam(value = "locationName", required = false) String locationName,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "mediaType", required = false) String mediaType,
            @RequestParam(value = "uploaderPhone", required = false) String uploaderPhone,
            Authentication authentication) {

        try {
            String phone = uploaderPhone;
            if ((phone == null || phone.isBlank()) && authentication != null) {
                phone = authentication.getName();
            }

            PublicReport report = publicReportService.createReport(
                    file,
                    category,
                    latitude,
                    longitude,
                    locationName,
                    description,
                    mediaType,
                    phone
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(report);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Error creating public report", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload and persist public report: " + ex.getMessage()));
        }
    }

    /**
     * Retrieve all public observation reports ordered by newest first.
     */
    @GetMapping
    public ResponseEntity<List<PublicReport>> getAllReports() {
        return ResponseEntity.ok(publicReportService.getAllReports());
    }

    /**
     * Stream uploaded photo or video resource.
     */
    @GetMapping("/media/{filename:.+}")
    public ResponseEntity<Resource> getMedia(@PathVariable String filename, HttpServletRequest request) {
        Resource resource = publicReportService.loadMediaAsResource(filename);

        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            logger.debug("Could not determine file mime type");
        }

        if (contentType == null) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".mp4")) contentType = "video/mp4";
            else if (lower.endsWith(".webm")) contentType = "video/webm";
            else if (lower.endsWith(".mov")) contentType = "video/quicktime";
            else if (lower.endsWith(".png")) contentType = "image/png";
            else if (lower.endsWith(".webp")) contentType = "image/webp";
            else contentType = "image/jpeg";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    /**
     * Verify a public report.
     * Strictly protected: Only users with ROLE_AUTHORITY or ROLE_ADMIN can execute this.
     */
    @PatchMapping("/{id}/verify")
    public ResponseEntity<?> verifyReport(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() ||
                authentication.getAuthorities().stream().noneMatch(a ->
                        "ROLE_AUTHORITY".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only authorized District/Admin officials can verify public reports."));
        }

        try {
            String verifiedBy = "District Disaster Management Official";
            if (authentication.getName() != null) {
                verifiedBy = "Official (" + authentication.getName() + ")";
            }

            PublicReport verifiedReport = publicReportService.verifyReport(id, verifiedBy);
            return ResponseEntity.ok(verifiedReport);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Error verifying report #{}", id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Verification failed: " + ex.getMessage()));
        }
    }
}
