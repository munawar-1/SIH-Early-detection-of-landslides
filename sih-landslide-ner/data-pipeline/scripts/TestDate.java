import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class TestDate {
    public static void main(String[] args) {
        String[] dates = {
            "04/19/2016 12:00:00 AM",
            "10/05/2013 11:00:00 PM"
        };
        for (String dateStr : dates) {
            String cleanDate = dateStr.trim().toUpperCase();
            try {
                LocalDate eventDate = LocalDate.parse(cleanDate, DateTimeFormatter.ofPattern("M/d/yyyy h:mm:ss a", Locale.US));
                System.out.println("Parsed: " + eventDate);
            } catch (Exception e) {
                System.out.println("Failed: " + cleanDate + " -> " + e.getMessage());
                e.printStackTrace();
            }
        }
    }
}
