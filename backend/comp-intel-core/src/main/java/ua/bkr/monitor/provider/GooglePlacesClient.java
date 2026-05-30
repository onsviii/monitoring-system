package ua.bkr.monitor.provider;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ua.bkr.monitor.exception.DataCollectionException;
import ua.bkr.monitor.model.enums.CollectionErrorType;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.provider.dto.GooglePlacesSearchResponse;
import ua.bkr.monitor.provider.dto.GoogleReviewsResponse;
import ua.bkr.monitor.provider.mapper.GooglePlacesMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class GooglePlacesClient {
    private RestClient restClient;
    private final GooglePlacesMapper mapper;

    @Value("${google.places.api-key}")
    private String apiKey;

    @Value("${google.places.text-search-url}")
    private String TEXT_SEARCH_URL;

    @Value("${google.places.details-url}")
    private String PLACE_DETAILS_URL;

    private static final int MAX_RETRIES = 3;

    @PostConstruct
    public void init() {
        this.restClient = RestClient.builder()
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .build();
    }

    /**
     * Пошук конкурентів за списком типів Google у жорсткому радіусі.
     */
    public List<PlaceInfo> searchCompetitors(
            List<String> googleTypes, Location location, int radiusKm,
            int maxResults, UUID sessionId) {

        if (googleTypes == null || googleTypes.isEmpty()) {
            return List.of();
        }

        Map<String, Object> body = new HashMap<>();
        body.put("textQuery", googleTypes.get(0));
        body.put("languageCode", "uk");
        body.put("maxResultCount", maxResults);
        body.put("locationRestriction", Map.of(
                "circle", Map.of(
                        "center", Map.of("latitude", location.latitude(), "longitude", location.longitude()),
                        "radius", radiusKm * 1000.0
                )
        ));

        try {
            GooglePlacesSearchResponse response = restClient.post()
                    .uri(TEXT_SEARCH_URL)
                    .header("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.rating,places.location,places.primaryType")
                    .body(body)
                    .retrieve()
                    .body(GooglePlacesSearchResponse.class);

            return response != null ? mapper.toPlaceInfoList(response.places()) : List.of();
        } catch (Exception e) {
            CollectionErrorType type = CollectionErrorType.SEARCH_FAILED;
            logError(sessionId, type, e.getMessage());
            throw new DataCollectionException(type, null,
                    "Failed to search competitors via Google Places API:\n%s".formatted(e.getMessage()));
        }
    }

    /**
     * Вільний пошук закладу за назвою (наприклад, під час реєстрації власного бізнесу).
     */
    public List<PlaceInfo> search(String query, Location location) {
        Map<String, Object> body = new HashMap<>();
        body.put("textQuery", query);
        body.put("languageCode", "uk");
        body.put("maxResultCount", 5);

        // М'яке підтягування результатів ближче до користувача
        if (location.latitude() != null && location.longitude() != null) {
            body.put("locationBias", Map.of(
                    "circle", Map.of(
                            "center", Map.of("latitude", location.latitude(),
                                    "longitude", location.longitude()),
                            "radius", 5000.0
                    )
            ));
        }

        try {
            return executeSearchRequest(body);
        } catch (Exception e) {
            log.error("Failed to execute free search for query: {}", query);
            throw new RuntimeException("Failed to search places", e);
        }
    }

    /**
     * Збір відгуків для конкретного закладу.
     */
    public List<RawReview> fetchReviews(String placeId, UUID sessionId) {
        String url = String.format(PLACE_DETAILS_URL, placeId);
        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                GoogleReviewsResponse response = restClient.get()
                        .uri(url)
                        .retrieve()
                        .body(GoogleReviewsResponse.class);

                return response != null ? mapper.toRawReviewsFiltered(response.reviews()) : List.of();
            } catch (Exception e) {
                lastException = e;
                log.warn("Attempt {}/{} failed for place {}: {}", attempt, MAX_RETRIES, placeId, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    exponentialBackoff(attempt);
                }
            }
        }

        CollectionErrorType type = CollectionErrorType.REVIEW_FETCH_FAILED;
        String errorMsg = lastException.getMessage();

        logError(sessionId, type, errorMsg);
        throw new DataCollectionException(type, placeId, errorMsg);
    }

    private List<PlaceInfo> executeSearchRequest(Map<String, Object> body) {
        GooglePlacesSearchResponse response = restClient.post()
                .uri(TEXT_SEARCH_URL)
                .header("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.rating,places.location,places.primaryType")
                .body(body)
                .retrieve()
                .body(GooglePlacesSearchResponse.class);

        return response != null ? mapper.toPlaceInfoList(response.places()) : List.of();
    }

    private void exponentialBackoff(int attempt) {
        try {
            long delay = (long) Math.pow(2, attempt) * 1000;
            Thread.sleep(delay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void logError(UUID sessionId, CollectionErrorType errorType, String description) {
        if (sessionId != null) {
            log.error("Collection error [{}] for session {}: {}", errorType, sessionId, description);
        } else {
            log.error("Collection error [{}]: {}", errorType, description);
        }
    }

    public record PlaceInfo(
            String placeId,
            String name,
            String address,
            String category,
            Double rating,
            Location location) {}

    public record RawReview(
            String text,
            Integer rating,
            String publishTime) {}
}