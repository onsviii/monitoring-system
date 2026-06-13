package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.dto.CreateAnalysisRequest;
import ua.bkr.monitor.event.AnalysisCreatedEvent;
import ua.bkr.monitor.exception.DataCollectionException;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.AnalysisStage;
import ua.bkr.monitor.model.enums.CollectionErrorType;
import ua.bkr.monitor.model.enums.SessionStatus;
import ua.bkr.monitor.model.record.ExtractedCharacteristic;
import ua.bkr.monitor.model.record.GeneratedRecommendation;
import ua.bkr.monitor.model.record.IndexedReview;
import ua.bkr.monitor.provider.GooglePlacesClient;
import ua.bkr.monitor.provider.MlServiceClient;
import ua.bkr.monitor.provider.dto.AspectClassification;
import ua.bkr.monitor.repository.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.IntStream;

/**
 * Оркестратор аналітичного конвеєра.
 * COLLECTING_DATA → ANONYMIZING → CLASSIFYING → EXTRACTING_CHARACTERISTICS → GENERATING_REPORT → COMPLETED
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
    private final FreeCharacteristicRepository freeCharacteristicRepository;
    private final StatisticsAggregator statisticsAggregator;
    private final GooglePlacesClient googlePlacesClient;
    private final MlServiceClient mlServiceClient;
    private final LlmAnalysisService llmAnalysisService;
    private final CollectionErrorLogRepository errorLogRepository;
    private final AnalyticalReportRepository reportRepository;
    private final AspectCategoryRepository aspectCategoryRepository;
    private final CharacteristicSourceRepository characteristicSourceRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationSourceRepository recommendationSourceRepository;
    private final ObjectProvider<PipelineOrchestrator> selfProvider;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAnalysisCreated(AnalysisCreatedEvent event) {
        runAsync(event.sessionId(), event.request());
    }

    @Async
    @Transactional(noRollbackFor = DataCollectionException.class)
    public void runAsync(UUID sessionId, CreateAnalysisRequest request) {
        AnalysisSession session = sessionRepository.findWithUserById(sessionId).orElseThrow();
        session.setStatus(SessionStatus.RUNNING);
        session.setStage(AnalysisStage.COLLECTING_DATA);
        sessionRepository.save(session);

        try {
            runFromCollecting(session, request);
        } catch (DataCollectionException e) {
            log.warn("Data collection error for session {}: {}", sessionId, e.getMessage());
            selfProvider.getObject().failSession(session, e.getErrorType().name(), e.getMessage());
        } catch (Exception e) {
            log.warn("Data collection error for session {}: {}", sessionId, e.getMessage());
            selfProvider.getObject().failSession(session, "UNKNOWN", e.getMessage());
        }
    }

    @Async
    @Transactional(noRollbackFor = DataCollectionException.class)
    public void resumeAsync(UUID sessionId) {
        AnalysisSession session = sessionRepository.findWithUserById(sessionId).orElseThrow();
        session.setStatus(SessionStatus.RUNNING);
        sessionRepository.save(session);

        AnalysisStage stage = session.getStage();
        cleanFromStage(sessionId, stage);

        try {
            switch (session.getStage()) {
                case COLLECTING_DATA -> runFromCollecting(session);
                case ANONYMIZING     -> runFromAnonymizing(session);
                case CLASSIFYING     -> runFromClassifying(session);
                case EXTRACTING_CHARACTERISTICS -> runFromExtracting(session);
                case GENERATING_REPORT -> runFromGenerating(session);
            }
        } catch (DataCollectionException e) {
            selfProvider.getObject().failSession(session, e.getErrorType().name(), e.getMessage());
        } catch (Exception e) {
            selfProvider.getObject().failSession(session, "UNKNOWN", e.getMessage());
        }
    }

    private void runFromCollecting(AnalysisSession session, CreateAnalysisRequest request) {
        updateStage(session, AnalysisStage.COLLECTING_DATA);

        List<Competitor> competitors = request.selectedPlaces().stream()
                .map(place -> mapToCompetitor(session, place))
                .toList();

        competitorRepository.saveAll(competitors);
        markOwnBusiness(session, competitors);

        Map<UUID, List<GooglePlacesClient.RawReview>> rawReviews =
                fetchAllReviews(competitors, session.getId());

        runAnonymization(session, competitors, rawReviews);
    }

    private void runFromCollecting(AnalysisSession session) {
        updateStage(session, AnalysisStage.COLLECTING_DATA);

        List<Competitor> competitors = competitorRepository.findBySessionId(session.getId());

        if (competitors.isEmpty()) {
            throw new DataCollectionException(
                    CollectionErrorType.SEARCH_FAILED, null,
                    "No competitors found, please create a new analysis");
        }

        Map<UUID, List<GooglePlacesClient.RawReview>> rawReviews =
                fetchAllReviews(competitors, session.getId());

        runAnonymization(session, competitors, rawReviews);
    }

    private Competitor mapToCompetitor(
            AnalysisSession session, CreateAnalysisRequest.SelectedPlace place) {

        Competitor c = new Competitor();
        c.setSession(session);
        c.setNiche(session.getBusinessNiche());
        c.setExternalApiId(place.placeId());
        c.setName(place.name());
        c.setAddress(place.address());
        c.setRating(place.rating());
        return c;
    }

    private void runFromAnonymizing(AnalysisSession session) {
        List<Competitor> competitors = competitorRepository.findBySessionId(session.getId());

        Map<UUID, List<GooglePlacesClient.RawReview>> rawReviewsByCompetitor =
                fetchAllReviews(competitors, session.getId());

        runAnonymization(session, competitors, rawReviewsByCompetitor);
    }

    private void runFromExtracting(AnalysisSession session) {
        List<Competitor> competitors = competitorRepository.findBySessionId(session.getId());
        List<Review> reviews = reviewRepository.findByCompetitorSessionId(session.getId());

        runCharacteristicsExtraction(session, competitors, reviews);
    }

    private void runFromGenerating(AnalysisSession session) {
        List<UUID> competitorIds = competitorRepository.findBySessionId(session.getId())
                .stream()
                .map(Competitor::getId)
                .toList();

        List<ExtractedCharacteristic> characteristics =
                freeCharacteristicRepository.findByCompetitorIdIn(competitorIds)
                        .stream()
                        .map(fc -> new ExtractedCharacteristic(fc.getText(), List.of()))
                        .toList();

        runReportGeneration(session, characteristics);
    }

    private void runFromClassifying(AnalysisSession session) {
        List<Review> reviews = reviewRepository.findByCompetitorSessionId(session.getId());

        runClassification(session, reviews);
    }

    private void runAnonymization(
            AnalysisSession session, List<Competitor> competitors,
            Map<UUID, List<GooglePlacesClient.RawReview>> rawReviews) {

        updateStage(session, AnalysisStage.ANONYMIZING);
        reviewRepository.deleteByCompetitorSessionId(session.getId());

        List<Review> savedReviews = new ArrayList<>();

        for (Competitor competitor : competitors) {
            List<GooglePlacesClient.RawReview> raws =
                    rawReviews.getOrDefault(competitor.getId(), List.of());

            List<String> texts = raws.stream().map(GooglePlacesClient.RawReview::text).toList();
            List<String> anonymized = mlServiceClient.anonymize(texts);

            for (int i = 0; i < anonymized.size(); i++) {
                Review review = new Review();
                review.setCompetitor(competitor);
                review.setText(anonymized.get(i));
                review.setRating(raws.get(i).rating());
                review.setCreatedAt(parsePublishTime(raws.get(i).publishTime()));
                savedReviews.add(reviewRepository.save(review));
            }
        }

        runClassification(session, savedReviews);
    }

    private void runClassification(AnalysisSession session, List<Review> reviews) {
        updateStage(session, AnalysisStage.CLASSIFYING);

        aspectSentimentRepository.deleteByReviewCompetitorSessionId(session.getId());

        List<String> texts = reviews.stream().map(Review::getText).toList();
        List<AspectClassification> results = mlServiceClient.classify(texts);

        for (int i = 0; i < reviews.size(); i++) {
            saveAspectSentiments(reviews.get(i), results.get(i));
        }

        List<Competitor> competitors = competitorRepository.findBySessionId(session.getId());
        runCharacteristicsExtraction(session, competitors, reviews);
    }

    private void runCharacteristicsExtraction(
            AnalysisSession session, List<Competitor> competitors, List<Review> reviews) {

        updateStage(session, AnalysisStage.EXTRACTING_CHARACTERISTICS);

        List<ExtractedCharacteristic> allCharacteristics = new ArrayList<>();

        for (Competitor competitor : competitors) {
            List<Review> compReviews = reviews.stream()
                    .filter(r -> r.getCompetitor().getId().equals(competitor.getId()))
                    .toList();

            List<IndexedReview> indexed = IntStream.range(0, compReviews.size())
                    .mapToObj(i -> new IndexedReview(i, compReviews.get(i).getText()))
                    .toList();

            List<ExtractedCharacteristic> characteristics =
                    llmAnalysisService.extractCharacteristics(
                            competitor.getName(), indexed, session.getId());

            allCharacteristics.addAll(characteristics);
            saveCharacteristics(competitor, compReviews, characteristics);

            if (competitors.indexOf(competitor) < competitors.size() - 1) {
                sleep(3000);
            }
        }

        runReportGeneration(session, allCharacteristics);
    }

    private void markOwnBusiness(AnalysisSession session, List<Competitor> competitors) {
        String userPlaceId = session.getUser().getGooglePlaceId();
        if (userPlaceId == null) return;

        competitors.stream()
                .filter(c -> userPlaceId.equals(c.getExternalApiId()))
                .findFirst()
                .ifPresent(c -> {
                    c.setOwnBusiness(true);
                    competitorRepository.save(c);
                });
    }

    private void saveAspectSentiments(Review review, AspectClassification result) {
        result.aspects().forEach((name, aspectResult) -> {
            AspectCategory category = aspectCategoryRepository.findByName(name)
                    .orElseThrow(() -> new ResourceNotFoundException("Aspect not found: " + name));

            AspectSentiment sentiment = new AspectSentiment();
            sentiment.setReview(review);
            sentiment.setCategory(category);
            sentiment.setPolarity(aspectResult.polarity());
            sentiment.setConfidenceScore(aspectResult.confidence());
            aspectSentimentRepository.save(sentiment);
        });
    }

    private void saveCharacteristics(Competitor competitor,
                                     List<Review> compReviews,
                                     List<ExtractedCharacteristic> characteristics) {
        for (ExtractedCharacteristic ec : characteristics) {
            FreeCharacteristic fc = new FreeCharacteristic();
            fc.setCompetitor(competitor);
            fc.setText(ec.text());
            fc = freeCharacteristicRepository.save(fc);

            for (Integer idx : ec.sourceIndices()) {
                if (idx >= 0 && idx < compReviews.size()) {
                    CharacteristicSource source = new CharacteristicSource();
                    source.setCharacteristic(fc);
                    source.setReview(compReviews.get(idx));
                    characteristicSourceRepository.save(source);
                }
            }
        }

    }

    private void runReportGeneration(
            AnalysisSession session, List<ExtractedCharacteristic> characteristics) {

        updateStage(session, AnalysisStage.GENERATING_REPORT);

        UUID sessionId = session.getId();

        AggregatedStatistics stats = statisticsAggregator.aggregate(sessionId);

        List<Review> allReviews = reviewRepository.findByCompetitorSessionId(sessionId);

        List<IndexedReview> indexedAll = IntStream.range(0, allReviews.size())
                .mapToObj(i -> new IndexedReview(i, allReviews.get(i).getText()))
                .toList();

        List<GeneratedRecommendation> recommendations = llmAnalysisService.generateRecommendations(
                session.getBusinessNiche().getDisplayName(), stats, characteristics,
                indexedAll, sessionId);

        AnalyticalReport report = new AnalyticalReport();
        report.setName(session.getReportName());
        report.setSession(session);
        report.setAggregatedStatistics(stats);
        report.setGeneratedAt(LocalDateTime.now());
        report.setAiMarked(true);
        report = reportRepository.save(report);

        for (GeneratedRecommendation rec : recommendations) {
            Recommendation entity = new Recommendation();
            entity.setReport(report);
            entity.setText(rec.text());
            entity = recommendationRepository.save(entity);

            for (Integer idx : rec.sourceIndices()) {
                if (idx >= 0 && idx < allReviews.size()) {
                    RecommendationSource source = new RecommendationSource();
                    source.setRecommendation(entity);
                    source.setReview(allReviews.get(idx));
                    recommendationSourceRepository.save(source);
                }
            }
        }

        session.setStatus(SessionStatus.COMPLETED);
        session.setStage(null);
        sessionRepository.save(session);
    }

    private Map<UUID, List<GooglePlacesClient.RawReview>> fetchAllReviews(
            List<Competitor> competitors, UUID sessionId) {
        Map<UUID, List<GooglePlacesClient.RawReview>> result = new HashMap<>();
        for (Competitor c : competitors) {
            try {
                result.put(c.getId(), googlePlacesClient.fetchReviews(c.getExternalApiId(), sessionId));
            } catch (DataCollectionException e) {
                persistCollectionError(sessionId, e.getErrorType().name(), e.getMessage());
                throw e;
            }
        }
        return result;
    }

    private void updateStage(AnalysisSession session, AnalysisStage stage) {
        session.setStage(stage);
        sessionRepository.saveAndFlush(session);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void failSession(AnalysisSession session, String errorType, String message) {
        session.setStatus(SessionStatus.FAILED);
        sessionRepository.save(session);

        CollectionErrorLog error = new CollectionErrorLog();
        error.setSession(session);
        error.setErrorType(errorType);
        error.setDescription(message);
        error.setTimestamp(LocalDateTime.now());
        errorLogRepository.save(error);
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
                errorLogRepository.save(log);
            });
        } catch (Exception e) {
            log.warn("Failed to persist collection error log: {}", e.getMessage());
        }
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void cleanFromStage(UUID sessionId, AnalysisStage stage) {
        switch (stage) {
            case ANONYMIZING -> {
                cleanReport(sessionId);
                cleanCharacteristics(sessionId);
                cleanClassification(sessionId);
                cleanReviews(sessionId);
            }
            case CLASSIFYING -> {
                cleanReport(sessionId);
                cleanCharacteristics(sessionId);
                cleanClassification(sessionId);
            }
            case EXTRACTING_CHARACTERISTICS -> {
                cleanReport(sessionId);
                cleanCharacteristics(sessionId);
            }
            case GENERATING_REPORT -> {
                cleanReport(sessionId);
            }
            default -> {}
        }
    }

    private void cleanReport(UUID sessionId) {
        recommendationSourceRepository.deleteByRecommendationReportSessionId(sessionId);
        recommendationRepository.deleteByReportSessionId(sessionId);
        reportRepository.deleteBySessionId(sessionId);
    }

    private void cleanCharacteristics(UUID sessionId) {
        characteristicSourceRepository.deleteByCharacteristicCompetitorSessionId(sessionId);
        freeCharacteristicRepository.deleteByCompetitorSessionId(sessionId);
    }

    private void cleanClassification(UUID sessionId) {
        aspectSentimentRepository.deleteByReviewCompetitorSessionId(sessionId);
    }

    private void cleanReviews(UUID sessionId) {
        reviewRepository.deleteByCompetitorSessionId(sessionId);
    }
}