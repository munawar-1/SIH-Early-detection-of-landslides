import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.time.Duration;

public class HistoricalWeatherExtractor {

    private static final String INPUT_CSV = "../processed/ner_landslides_raw.csv";
    private static final String OUTPUT_CSV = "../processed/ml_training_dataset_real.csv";
    private static final String API_TEMPLATE = "https://archive-api.open-meteo.com/v1/archive?latitude=%s&longitude=%s&start_date=%s&end_date=%s&daily=precipitation_sum&timezone=auto";

    public static void main(String[] args) {
        System.out.println("🚀 Starting Polite Sequential Weather Extraction...");
        long startTime = System.currentTimeMillis();

        try {
            Path inputPath = Paths.get(INPUT_CSV);
            if (!Files.exists(inputPath)) {
                System.out.println("[❌ ERROR] Input CSV not found at: " + inputPath.toAbsolutePath());
                return;
            }

            List<String> lines = Files.readAllLines(inputPath);
            String header = lines.get(0);
            List<String> dataLines = lines.subList(1, lines.size());

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            List<String> results = new ArrayList<>();
            int successCount = 0;

            System.out.println("Processing " + dataLines.size() + " records. Please wait...");

            for (int i = 0; i < dataLines.size(); i++) {
                String line = dataLines.get(i);

                // Bulletproof CSV split (ignores commas inside quotes)
                String[] columns = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

                if (columns.length <= 30)
                    continue; // Skip malformed rows

                String lon = columns[29].trim();
                String lat = columns[30].trim();
                String eventDateStr = columns[3].trim();

                double latNum = Double.parseDouble(lat);
                double lonNum = Double.parseDouble(lon);

                Double slope = fetchTerrainSlope(client, latNum, lonNum);
                Double clayPercent = fetchClayPercent(client, latNum, lonNum);
                
                double finalSlope = (slope != null) ? slope : 30.0;
                double finalClay = (clayPercent != null) ? clayPercent : 35.0;

                String resultLine = fetchWeatherDataPolitely(client, lat, lon, eventDateStr, line, finalSlope, finalClay);

                if (resultLine != null) {
                    results.add(resultLine);
                    successCount++;
                }

                // Print progress every 50 records
                if ((i + 1) % 50 == 0) {
                    System.out.println("Processed " + (i + 1) + "/" + dataLines.size() + "...");
                }

                // Sleep for 150ms to respect API rate limits
                Thread.sleep(150);
            }

            List<String> outputLines = new ArrayList<>();
            outputLines.add(
                    header + ",slope,clay_percent,rain_day_minus_3_mm,rain_day_minus_2_mm,rain_day_minus_1_mm,rain_event_day_mm,target");
            outputLines.addAll(results);

            Files.write(Paths.get(OUTPUT_CSV), outputLines);

            long endTime = System.currentTimeMillis();
            System.out.println("✅ [SUCCESS] Extracted " + successCount + " real weather records in "
                    + (endTime - startTime) / 1000 + " seconds!");
            System.out.println("📂 Saved to: " + OUTPUT_CSV);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String fetchWeatherDataPolitely(HttpClient client, String lat, String lon, String eventDateStr,
            String originalLine, double slope, double clayPercent) {
        String cleanDate = eventDateStr.trim().toUpperCase();
        if (cleanDate.contains(" ")) {
            cleanDate = cleanDate.split(" ")[0];
        }

        LocalDate eventDate;
        try {
            if (cleanDate.contains("/")) {
                eventDate = LocalDate.parse(cleanDate, DateTimeFormatter.ofPattern("M/d/yyyy"));
            } else {
                eventDate = LocalDate.parse(cleanDate, DateTimeFormatter.ISO_LOCAL_DATE);
            }
        } catch (Exception e) {
            System.err.println("⚠️ Could not parse date: " + eventDateStr);
            return null;
        }

        LocalDate startDate = eventDate.minusDays(7);
        String url = String.format(API_TEMPLATE, lat, lon, startDate.toString(), eventDate.toString());
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        try {
            HttpResponse<String> response = sendRequestWithRetry(client, request, 3);
            if (response.statusCode() == 200) {
                return parsePrecipitationData(response.body(), originalLine, slope, clayPercent);
            } else {
                System.err.println("⚠️ API Error for " + lat + ", " + lon + " (HTTP " + response.statusCode() + ")");
                return null;
            }
        } catch (Exception e) {
            System.err.println("⚠️ Network Error: " + e.getMessage());
            return null;
        }
    }

    private static String parsePrecipitationData(String json, String originalLine, double slope, double clayPercent) {
        try {
            String targetKey = "\"precipitation_sum\":[";
            int startIndex = json.indexOf(targetKey) + targetKey.length();
            int endIndex = json.indexOf("]", startIndex);
            String[] rainValues = json.substring(startIndex, endIndex).split(",");

            if (rainValues.length >= 8) {
                // Safe Sample (Target = 0) from Day -7 to Day -4
                String safeDayMinus3 = rainValues[0].trim().replace("null", "0.0");
                String safeDayMinus2 = rainValues[1].trim().replace("null", "0.0");
                String safeDayMinus1 = rainValues[2].trim().replace("null", "0.0");
                String safeEventDay = rainValues[3].trim().replace("null", "0.0");
                
                // Danger Sample (Target = 1) from Day -3 to Event Day
                String dangerDayMinus3 = rainValues[4].trim().replace("null", "0.0");
                String dangerDayMinus2 = rainValues[5].trim().replace("null", "0.0");
                String dangerDayMinus1 = rainValues[6].trim().replace("null", "0.0");
                String dangerEventDay = rainValues[7].trim().replace("null", "0.0");

                String safeRow = String.format("%s,%.2f,%.2f,%s,%s,%s,%s,0", 
                        originalLine, slope, clayPercent, safeDayMinus3, safeDayMinus2, safeDayMinus1, safeEventDay);
                        
                String dangerRow = String.format("%s,%.2f,%.2f,%s,%s,%s,%s,1", 
                        originalLine, slope, clayPercent, dangerDayMinus3, dangerDayMinus2, dangerDayMinus1, dangerEventDay);
                        
                return safeRow + "\n" + dangerRow;
            }
        } catch (Exception e) {
            System.err.println("⚠️ JSON parsing error: " + e.getMessage());
        }
        return null;
    }

    private static Double fetchClayPercent(HttpClient client, double lat, double lon) {
        String url = String.format(
            "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=%s&lat=%s&property=clay&depth=0-5cm&value=mean",
            lon, lat
        );
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        
        try {
            HttpResponse<String> response = sendRequestWithRetry(client, request, 3);
            if (response.statusCode() == 200) {
                String json = response.body();
                String targetKey = "\"mean\":";
                int startIndex = json.indexOf(targetKey);
                if (startIndex != -1) {
                    startIndex += targetKey.length();
                    int endIndex = startIndex;
                    while (endIndex < json.length() && 
                          (Character.isDigit(json.charAt(endIndex)) || 
                           json.charAt(endIndex) == '.' || 
                           json.charAt(endIndex) == '-')) {
                        endIndex++;
                    }
                    if (endIndex > startIndex) {
                        try {
                            double meanValue = Double.parseDouble(json.substring(startIndex, endIndex));
                            return meanValue / 10.0;
                        } catch (NumberFormatException e) {
                            // ignore and return null
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ SoilGrids API Error for " + lat + ", " + lon + ": " + e.getMessage());
        }
        return null;
    }

    private static Double fetchTerrainSlope(HttpClient client, double lat, double lon) {
        double offset = 0.0005;
        double latN = lat + offset, latS = lat - offset;
        double lonE = lon + offset, lonW = lon - offset;

        String url = String.format(
            "https://api.open-meteo.com/v1/elevation?latitude=%s,%s,%s,%s&longitude=%s,%s,%s,%s",
            latN, latS, lat, lat, lon, lon, lonE, lonW
        );
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        
        try {
            HttpResponse<String> response = sendRequestWithRetry(client, request, 3);
            if (response.statusCode() == 200) {
                String json = response.body();
                String targetKey = "\"elevation\":[";
                int startIndex = json.indexOf(targetKey);
                if (startIndex != -1) {
                    startIndex += targetKey.length();
                    int endIndex = json.indexOf("]", startIndex);
                    String[] elevs = json.substring(startIndex, endIndex).split(",");
                    
                    if (elevs.length == 4 && !elevs[0].contains("null")) {
                        double en = Double.parseDouble(elevs[0].trim());
                        double es = Double.parseDouble(elevs[1].trim());
                        double ee = Double.parseDouble(elevs[2].trim());
                        double ew = Double.parseDouble(elevs[3].trim());

                        double dz_dx = (ee - ew) / 100.0;
                        double dz_dy = (en - es) / 100.0;
                        
                        double slopeRad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
                        return Math.toDegrees(slopeRad);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Elevation API Error for " + lat + ", " + lon + ": " + e.getMessage());
        }
        return null;
    }

    private static HttpResponse<String> sendRequestWithRetry(HttpClient client, HttpRequest request, int maxRetries) throws Exception {
        Exception lastException = null;
        for (int i = 0; i < maxRetries; i++) {
            try {
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200 || response.statusCode() == 404 || response.statusCode() == 400) {
                    return response; 
                }
            } catch (Exception e) {
                lastException = e;
            }
            // Sleep with exponential backoff before retrying
            Thread.sleep((long) (500 * Math.pow(2, i))); 
        }
        if (lastException != null) {
            throw lastException;
        }
        throw new RuntimeException("API Request failed after " + maxRetries + " retries");
    }
}