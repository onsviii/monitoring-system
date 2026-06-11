package ua.bkr.monitor.provider;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ua.bkr.monitor.provider.dto.AspectClassification;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.provider.dto.AspectResult;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * HTTP-клієнт до ML-сервісу.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MlServiceClient {
    private RestClient restClient;

    @Value("${ml-service.base-url}")
    private String baseUrl;


    @PostConstruct
    public void init() {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public List<String> anonymize(List<String> texts) {
        log.info("Anonymizing {} texts via ML service", texts.size());

        try {
            MlAnonymizeResponse response = restClient.post()
                    .uri("/anonymize")
                    .body(Map.of("texts", texts))
                    .retrieve()
                    .body(MlAnonymizeResponse.class);

            List<String> result = response != null && response.texts() != null
                    ? response.texts()
                    : List.of();

            log.info("Anonymization complete: {} texts processed", result.size());
            return result;
        } catch (Exception e) {
            log.error("Failed to anonymize texts: {}", e.getMessage());
            throw new RuntimeException("ML Service anonymization failed", e);
        }
    }

    public List<AspectClassification> classify(List<String> texts) {
        log.info("Classifying {} texts via ML service", texts.size());

        try {
            MlClassifyResponse response = restClient.post()
                    .uri("/classify")
                    .body(Map.of("texts", texts))
                    .retrieve()
                    .body(MlClassifyResponse.class);

            if (response == null || response.predictions() == null) {
                return List.of();
            }

            List<AspectClassification> results = response.predictions().stream()
                    .map(this::parsePredictionMap)
                    .toList();

            log.info("Classification complete: {} predictions", results.size());
            return results;
        } catch (Exception e) {
            log.error("Failed to classify texts: {}", e.getMessage());
            throw new RuntimeException("ML Service classification failed", e);
        }
    }

    public boolean isHealthy() {
        try {
            restClient.get().uri("/health").retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("ML service health check failed: {}", e.getMessage());
            return false;
        }
    }

    private AspectClassification parsePredictionMap(Map<String, AspectResult> rawPrediction) {
        Map<Aspect, AspectResult> aspects = new EnumMap<>(Aspect.class);

        rawPrediction.forEach((key, result) -> {
            if (result != null) {
                try {
                    Aspect aspect = Aspect.valueOf(key.toUpperCase());
                    aspects.put(aspect, result);
                } catch (IllegalArgumentException e) {
                    log.warn("Unknown aspect received from ML service: '{}'. Ignoring.", key);
                }
            }
        });

        return new AspectClassification(aspects);
    }

    private record MlAnonymizeResponse(List<String> texts) {}
    private record MlClassifyResponse(List<Map<String, AspectResult>> predictions) {}
}