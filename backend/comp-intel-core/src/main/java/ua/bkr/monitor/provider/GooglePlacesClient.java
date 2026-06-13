package ua.bkr.monitor.provider;

import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import ua.bkr.monitor.exception.DataCollectionException;
import ua.bkr.monitor.model.enums.CollectionErrorType;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.provider.dto.GooglePlaceDto;
import ua.bkr.monitor.provider.dto.GooglePlacesSearchResponse;
import ua.bkr.monitor.provider.dto.SerpApiReviewDto;
import ua.bkr.monitor.provider.mapper.GooglePlacesMapper;

import java.util.*;

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

    @Value("${serp.api.key}")
    private String serpApiKey;

    @Value("${serp.api.reviews.max-pages:2}")
    private int maxPages;

    private RestClient serpRestClient;
    private final ObjectMapper objectMapper;

    private static final int MAX_RETRIES = 3;

    @PostConstruct
    public void init() {
        this.restClient = RestClient.builder()
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .build();
        this.serpRestClient = RestClient.create();
    }

    public PlaceInfo getPlaceInfo(String placeId) {
        String url = String.format(PLACE_DETAILS_URL, placeId);

        try {
            GooglePlaceDto dto = restClient.get()
                    .uri(url)
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask",
                            "id,displayName,formattedAddress,rating,userRatingCount,location,primaryType")
                    .retrieve()
                    .body(GooglePlaceDto.class);

            return mapper.toPlaceInfo(dto);

        } catch (Exception e) {
            throw new DataCollectionException(
                    CollectionErrorType.SEARCH_FAILED, placeId, e.getMessage());
        }
    }

    /**
     * Пошук конкурентів за списком типів Google у жорсткому радіусі.
     */
    public List<PlaceInfo> searchCompetitors(
            List<String> googleTypes, Location location, double radiusKm,
            int maxResults, UUID sessionId) {

        if (googleTypes == null || googleTypes.isEmpty()) {
            return List.of();
        }

        Map<String, Object> body = new HashMap<>();
        body.put("textQuery", googleTypes.get(0));
        body.put("languageCode", "uk");
        body.put("maxResultCount", maxResults);

        double lat = location.latitude();
        double lng = location.longitude();
        double earthRadius = 6371.0;

        double dLat = Math.toDegrees(radiusKm / earthRadius);
        double dLng = Math.toDegrees(radiusKm / earthRadius / Math.cos(Math.toRadians(lat)));

        body.put("locationRestriction", Map.of(
                "rectangle", Map.of(
                        "low", Map.of("latitude", lat - dLat, "longitude", lng - dLng),
                        "high", Map.of("latitude", lat + dLat, "longitude", lng + dLng)
                )
        ));

        try {
            GooglePlacesSearchResponse response = restClient.post()
                    .uri(TEXT_SEARCH_URL)
                    .header("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.primaryType")
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
    public List<PlaceInfo> search(String query, List<String> googleTypes, Location location) {
        Map<String, Object> body = new HashMap<>();
        body.put("textQuery", query);
        body.put("languageCode", "uk");
        body.put("maxResultCount", 5);

        if (googleTypes != null && !googleTypes.isEmpty()) {
            body.put("includedType", googleTypes.get(0));
        }

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

        log.debug("Places free search: query='{}', googleTypes={}, location={}", query, googleTypes, location);
        try {
            List<PlaceInfo> results = executeSearchRequest(body);

            log.debug("Places free search returned {} results", results.size());
            return results;
        } catch (Exception e) {
            String errorMsg = "Failed to execute free search for query:\n%s".formatted(query);
            log.error("Places free search error for query='{}': {}", query, e.getMessage());
            CollectionErrorType type = CollectionErrorType.SEARCH_FAILED;
            logError(null, type, errorMsg);
            throw new DataCollectionException(type, null, errorMsg);
        }
    }

    /**
     * Збір відгуків для конкретного закладу через SerpApi Google Maps Place Results.
     */
    public List<RawReview> fetchReviews(String placeId, UUID sessionId) {
        List<SerpApiReviewDto> allReviews = new ArrayList<>();
        String nextPageToken = null;
        int page = 0;

        while (page < maxPages) {
            final String currentToken = nextPageToken;

            JsonNode responseNode = fetchPage(placeId, sessionId, currentToken);

            if (responseNode == null || !responseNode.hasNonNull("reviews")) {
                break;
            }

            List<SerpApiReviewDto> pageReviews = parseReviews(responseNode);
            if (pageReviews.isEmpty()) {
                break;
            }

            allReviews.addAll(pageReviews);
            page++;

            nextPageToken = extractNextPageToken(responseNode);
            if (nextPageToken == null) {
                break;
            }
        }

        return mapper.toRawReviewsFromSerpApi(allReviews);
    }

    private JsonNode fetchPage(String placeId, UUID sessionId, String nextPageToken) {
        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return serpRestClient.get()
                        .uri(uriBuilder -> {
                            var b = uriBuilder
                                    .scheme("https")
                                    .host("serpapi.com")
                                    .path("/search")
                                    .queryParam("engine", "google_maps_reviews")
                                    .queryParam("place_id", placeId)
                                    .queryParam("hl", "uk")
                                    .queryParam("api_key", serpApiKey);

                            if (nextPageToken != null) {
                                b.queryParam("next_page_token", nextPageToken);
                                b.queryParam("num", 20);
                            }

                            return b.build();
                        })
                        .retrieve()
                        .body(JsonNode.class);
            } catch (Exception e) {
                lastException = e;
                log.warn("Attempt {}/{} failed for place {}: {}",
                        attempt, MAX_RETRIES, placeId, e.getMessage());
                if (attempt < MAX_RETRIES) {
                    exponentialBackoff(attempt);
                }
            }
        }

        logError(sessionId, CollectionErrorType.REVIEW_FETCH_FAILED, lastException.getMessage());
        throw new DataCollectionException(
                CollectionErrorType.REVIEW_FETCH_FAILED, placeId, lastException.getMessage());
    }

    private String extractNextPageToken(JsonNode responseNode) {
        JsonNode pagination = responseNode.path("serpapi_pagination");
        if (pagination.hasNonNull("next_page_token")) {
            return pagination.get("next_page_token").asString();
        }
        return null;
    }

    private List<SerpApiReviewDto> parseReviews(JsonNode responseNode) {
        return objectMapper.treeToValue(
                responseNode.get("reviews"), new TypeReference<List<SerpApiReviewDto>>() {}
        );
    }

    private List<PlaceInfo> executeSearchRequest(Map<String, Object> body) {
        GooglePlacesSearchResponse response = restClient.post()
                .uri(TEXT_SEARCH_URL)
                .header("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.primaryType")
                .body(body)
                .retrieve()
                .body(GooglePlacesSearchResponse.class);

        if (response == null || response.places() == null) {
            return List.of();
        }

        List<PlaceInfo> mapped = mapper.toPlaceInfoList(response.places());
        return mapped != null ? mapped : List.of();
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
            Integer userRatingCount,
            Location location) {}

    public record RawReview(
            String text,
            Integer rating,
            String publishTime) {}
}