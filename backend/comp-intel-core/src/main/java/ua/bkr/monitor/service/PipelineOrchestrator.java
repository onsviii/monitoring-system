package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import ua.bkr.monitor.AnalysisCreatedEvent;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.dto.CreateAnalysisRequest;
import ua.bkr.monitor.exception.DataCollectionException;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.AnalysisStatus;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.model.record.ExtractedCharacteristic;
import ua.bkr.monitor.model.record.GeneratedRecommendation;
import ua.bkr.monitor.model.record.IndexedReview;
import ua.bkr.monitor.provider.GooglePlacesClient;
import ua.bkr.monitor.provider.MlServiceClient;
import ua.bkr.monitor.repository.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.IntStream;

/**
 * Оркестратор аналітичного конвеєра.
 *
 * COLLECTING_DATA → ANONYMIZING → CLASSIFYING → EXTRACTING_CHARACTERISTICS → GENERATING_REPORT → COMPLETED
 *
 * Кожен етап зберігає проміжні результати в БД перед переходом далі
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PipelineOrchestrator {

    private final AnalysisSessionRepository sessionRepository;
    private final CompetitorRepository competitorRepository;
    private final ReviewRepository reviewRepository;
    private final AspectSentimentRepository aspectSentimentRepository;
    private final AspectCategoryRepository aspectCategoryRepository;
    private final FreeCharacteristicRepository freeCharacteristicRepository;
    private final CharacteristicSourceRepository characteristicSourceRepository;
    private final AnalyticalReportRepository analyticalReportRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationSourceRepository recommendationSourceRepository;
    private final CollectionErrorLogRepository collectionErrorLogRepository;
    private final NicheRepository nicheRepository;

    private final StatisticsAggregator statisticsAggregator;
    private final GooglePlacesClient googlePlacesClient;
    private final MlServiceClient mlServiceClient;
    private final LlmAnalysisService llmAnalysisService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAnalysisCreated(AnalysisCreatedEvent event) {
        runAsync(event.sessionId(), event.request());
    }

    @Async
    public void runAsync(UUID sessionId, CreateAnalysisRequest request) {
        try {
            updateStatus(sessionId, AnalysisStatus.COLLECTING_DATA);
            Map<Competitor, List<GooglePlacesClient.RawReview>> rawData = collectData(sessionId, request);

            updateStatus(sessionId, AnalysisStatus.ANONYMIZING);
            Map<Competitor, List<Review>> savedReviews = anonymizeAndPersist(sessionId, rawData);

            updateStatus(sessionId, AnalysisStatus.CLASSIFYING);
            classifyAndPersist(savedReviews);

            updateStatus(sessionId, AnalysisStatus.EXTRACTING_CHARACTERISTICS);
            List<ExtractedCharacteristic> allCharacteristics = extractAndPersistCharacteristics(sessionId);

            updateStatus(sessionId, AnalysisStatus.GENERATING_REPORT);
            generateAndPersistReport(sessionId, request, allCharacteristics);

            updateStatus(sessionId, AnalysisStatus.COMPLETED);
            log.info("Pipeline completed successfully for session {}", sessionId);

        } catch (Exception e) {
            log.error("Pipeline failed for session {}: {}", sessionId, e.getMessage(), e);
            updateStatus(sessionId, AnalysisStatus.FAILED);
        }
    }

    private Map<Competitor, List<GooglePlacesClient.RawReview>> collectData(
            UUID sessionId, CreateAnalysisRequest request) {

        AnalysisSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        Niche niche = nicheRepository.findByCode(request.nicheCode())
                .orElseThrow(() -> new RuntimeException("Niche not found: " + request.nicheCode()));

        List<String> googleTypes = new ArrayList<>(niche.getGoogleTypes());
        int maxCount = request.maxCompetitors() != null ? request.maxCompetitors() : 10;

        List<GooglePlacesClient.PlaceInfo> places = googlePlacesClient.searchCompetitors(
                googleTypes, request.location(), request.radiusKm().intValue(), maxCount, sessionId);

        if (request.selectedPlaceIds() != null && !request.selectedPlaceIds().isEmpty()) {
            Set<String> selected = new HashSet<>(request.selectedPlaceIds());
            places = places.stream().filter(p -> selected.contains(p.placeId())).toList();
        }

        log.info("Collecting reviews for {} competitors in session {}", places.size(), sessionId);

        Map<Competitor, List<GooglePlacesClient.RawReview>> result = new LinkedHashMap<>();
        for (GooglePlacesClient.PlaceInfo place : places) {
            Competitor competitor = new Competitor();
            competitor.setExternalApiId(place.placeId());
            competitor.setName(place.name());
            competitor.setAddress(place.address());
            competitor.setRating(place.rating());
            List<GooglePlacesClient.RawReview> reviews = fetchReviewsSafely(place.placeId(), sessionId);
            result.put(competitor, reviews);
            competitor.setNiche(niche);
            competitor.setSession(session);
            competitorRepository.save(competitor);

            log.debug("Competitor '{}': {} reviews", place.name(), reviews.size());
        }

        return result;
    }

    private List<GooglePlacesClient.RawReview> fetchReviewsSafely(String placeId, UUID sessionId) {
        try {
            return googlePlacesClient.fetchReviews(placeId, sessionId);
        } catch (DataCollectionException e) {
            log.warn("Skipping reviews for place {} (session {}): {}", placeId, sessionId, e.getMessage());
            persistCollectionError(sessionId, e.getErrorType().name(), e.getMessage());
            return List.of();
        }
    }

    private Map<Competitor, List<Review>> anonymizeAndPersist(
            UUID sessionId, Map<Competitor, List<GooglePlacesClient.RawReview>> rawData) {

        List<Competitor> competitorOrder = new ArrayList<>();
        List<List<GooglePlacesClient.RawReview>> filteredPerCompetitor = new ArrayList<>();
        List<String> allTexts = new ArrayList<>();

        for (Map.Entry<Competitor, List<GooglePlacesClient.RawReview>> entry : rawData.entrySet()) {
            List<GooglePlacesClient.RawReview> filtered = entry.getValue().stream()
                    .filter(r -> r.text() != null && !r.text().isBlank())
                    .toList();
            competitorOrder.add(entry.getKey());
            filteredPerCompetitor.add(filtered);
            filtered.forEach(r -> allTexts.add(r.text()));
        }

        if (allTexts.isEmpty()) {
            log.warn("No review texts collected for session {} — skipping anonymization", sessionId);
            return Map.of();
        }

        List<String> anonymized = mlServiceClient.anonymize(allTexts);

        Map<Competitor, List<Review>> result = new LinkedHashMap<>();
        int offset = 0;

        for (int i = 0; i < competitorOrder.size(); i++) {
            Competitor competitor = competitorOrder.get(i);
            List<GooglePlacesClient.RawReview> raws = filteredPerCompetitor.get(i);
            List<Review> saved = new ArrayList<>();

            for (int j = 0; j < raws.size(); j++) {
                int globalIdx = offset + j;
                if (globalIdx >= anonymized.size()) break;

                Review review = new Review();
                review.setText(anonymized.get(globalIdx));
                review.setRating(raws.get(j).rating());
                review.setCreatedAt(parsePublishTime(raws.get(j).publishTime()));
                review.setCompetitor(competitor);
                saved.add(reviewRepository.save(review));
            }

            result.put(competitor, saved);
            offset += raws.size();
        }

        return result;
    }

    private void classifyAndPersist(Map<Competitor, List<Review>> reviewsByCompetitor) {
        Map<Aspect, AspectCategory> categoryCache = loadAspectCategoryCache();

        for (Map.Entry<Competitor, List<Review>> entry : reviewsByCompetitor.entrySet()) {
            List<Review> reviews = entry.getValue();
            if (reviews.isEmpty()) continue;

            List<String> texts = reviews.stream().map(Review::getText).toList();
            List<MlServiceClient.AspectClassification> classifications = mlServiceClient.classify(texts);

            for (int i = 0; i < reviews.size() && i < classifications.size(); i++) {
                Review review = reviews.get(i);
                for (Map.Entry<Aspect, MlServiceClient.AspectResult> aspectEntry
                        : classifications.get(i).aspects().entrySet()) {

                    AspectCategory category = categoryCache.get(aspectEntry.getKey());
                    if (category == null) {
                        log.warn("AspectCategory not found for aspect '{}' — skipping", aspectEntry.getKey());
                        continue;
                    }

                    MlServiceClient.AspectResult result = aspectEntry.getValue();
                    AspectSentiment sentiment = new AspectSentiment();
                    sentiment.setReview(review);
                    sentiment.setCategory(category);
                    sentiment.setPolarity(result.polarity());
                    sentiment.setConfidenceScore(result.confidence());
                    aspectSentimentRepository.save(sentiment);
                }
            }
        }
    }

    private List<ExtractedCharacteristic> extractAndPersistCharacteristics(UUID sessionId) {
        List<Competitor> competitors = competitorRepository.findBySessionId(sessionId);
        List<ExtractedCharacteristic> allCharacteristics = new ArrayList<>();

        for (Competitor competitor : competitors) {
            List<Review> reviews = reviewRepository.findByCompetitorId(competitor.getId());
            if (reviews.isEmpty()) continue;

            List<IndexedReview> indexed = IntStream.range(0, reviews.size())
                    .mapToObj(i -> new IndexedReview(i, reviews.get(i).getText()))
                    .toList();

            List<ExtractedCharacteristic> characteristics =
                    llmAnalysisService.extractCharacteristics(competitor.getName(), indexed, sessionId);

            for (ExtractedCharacteristic ec : characteristics) {
                FreeCharacteristic fc = new FreeCharacteristic();
                fc.setText(ec.text());
                fc.setCompetitor(competitor);
                FreeCharacteristic saved = freeCharacteristicRepository.save(fc);

                for (int idx : ec.sourceIndices()) {
                    if (idx >= 0 && idx < reviews.size()) {
                        characteristicSourceRepository.save(new CharacteristicSource(saved, reviews.get(idx)));
                    }
                }

                allCharacteristics.add(ec);
            }

            log.debug("Extracted {} characteristics for competitor '{}'",
                    characteristics.size(), competitor.getName());
        }

        return allCharacteristics;
    }

    private void generateAndPersistReport(
            UUID sessionId, CreateAnalysisRequest request,
            List<ExtractedCharacteristic> characteristics) {

        AnalysisSession session = sessionRepository.findWithNicheById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        AggregatedStatistics stats = statisticsAggregator.aggregate(sessionId);

        List<Review> allReviews = reviewRepository.findByCompetitorSessionId(sessionId);
        List<IndexedReview> indexedAll = IntStream.range(0, allReviews.size())
                .mapToObj(i -> new IndexedReview(i, allReviews.get(i).getText()))
                .toList();

        List<GeneratedRecommendation> recommendations = llmAnalysisService.generateRecommendations(
                session.getBusinessNiche().getDisplayName(),
                stats, characteristics, indexedAll, sessionId
        );

        AnalyticalReport report = new AnalyticalReport();
        report.setName(request.reportName());
        report.setSession(session);
        report.setAggregatedStatistics(stats);
        report.setGeneratedAt(LocalDateTime.now());
        report.setAiMarked(true);
        AnalyticalReport savedReport = analyticalReportRepository.save(report);

        for (GeneratedRecommendation gr : recommendations) {
            Recommendation rec = new Recommendation();
            rec.setText(gr.text());
            rec.setReport(savedReport);
            Recommendation savedRec = recommendationRepository.save(rec);

            for (int idx : gr.sourceIndices()) {
                if (idx >= 0 && idx < allReviews.size()) {
                    recommendationSourceRepository.save(new RecommendationSource(savedRec, allReviews.get(idx)));
                }
            }
        }

        log.info("Report '{}' generated with {} recommendations for session {}",
                request.reportName(), recommendations.size(), sessionId);
    }

    private void updateStatus(UUID sessionId, AnalysisStatus status) {
        AnalysisSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        session.setStatus(status);
        sessionRepository.save(session);
        log.info("Session {} → {}", sessionId, status);
    }

    private Map<Aspect, AspectCategory> loadAspectCategoryCache() {
        Map<Aspect, AspectCategory> cache = new EnumMap<>(Aspect.class);
        for (Aspect aspect : Aspect.values()) {
            aspectCategoryRepository.findByName(aspect)
                    .ifPresent(cat -> cache.put(aspect, cat));
        }
        return cache;
    }

    private LocalDateTime parsePublishTime(String publishTime) {
        if (publishTime == null || publishTime.isBlank()) return LocalDateTime.now();
        try {
            return OffsetDateTime.parse(publishTime).toLocalDateTime();
        } catch (DateTimeParseException e) {
            log.warn("Cannot parse review publishTime '{}', using now", publishTime);
            return LocalDateTime.now();
        }
    }

    private void persistCollectionError(UUID sessionId, String errorType, String description) {
        try {
            sessionRepository.findById(sessionId).ifPresent(session -> {
                CollectionErrorLog log = new CollectionErrorLog();
                log.setSession(session);
                log.setErrorType(errorType);
                log.setDescription(description);
                log.setTimestamp(LocalDateTime.now());
                collectionErrorLogRepository.save(log);
            });
        } catch (Exception e) {
            log.warn("Failed to persist collection error log: {}", e.getMessage());
        }
    }
}