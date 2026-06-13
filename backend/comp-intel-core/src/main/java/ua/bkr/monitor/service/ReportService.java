package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.bkr.monitor.dto.*;
import ua.bkr.monitor.dto.SourcesResponse.ReviewSourceDto;
import ua.bkr.monitor.mapper.ReportMapper;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.repository.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final AnalysisSessionRepository sessionRepository;
    private final AnalyticalReportRepository reportRepository;
    private final CompetitorRepository competitorRepository;
    private final ReviewRepository reviewRepository;
    private final AspectSentimentRepository aspectSentimentRepository;
    private final FreeCharacteristicRepository characteristicRepository;
    private final CharacteristicSourceRepository characteristicSourceRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationSourceRepository recommendationSourceRepository;
    private final UserProfileRepository userProfileRepository;
    private final ReportMapper reportMapper;


    @Transactional(readOnly = true)
    public ReportResponse getReport(String userId, UUID sessionId) {
        AnalysisSession session = getSessionForUser(userId, sessionId);

        AnalyticalReport report = reportRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Report not ready for session: " + sessionId));

        // 1. Отримуємо базові сутності
        List<Competitor> competitors = competitorRepository.findBySessionId(sessionId);
        List<UUID> competitorIds = competitors.stream().map(Competitor::getId).toList();

        List<Recommendation> recommendations = recommendationRepository.findByReportId(report.getId());
        List<UUID> recommendationIds = recommendations.stream().map(Recommendation::getId).toList();

        // 2. BULK FETCHING мап
        Map<UUID, List<Review>> reviewsMap = reviewRepository.findByCompetitorIdIn(competitorIds).stream()
                .collect(Collectors.groupingBy(r -> r.getCompetitor().getId()));

        Map<UUID, List<AspectSentiment>> aspectsMap = aspectSentimentRepository.findByReviewCompetitorIdIn(competitorIds).stream()
                .collect(Collectors.groupingBy(s -> s.getReview().getCompetitor().getId()));

        List<FreeCharacteristic> allCharacteristics = characteristicRepository.findByCompetitorIdIn(competitorIds);
        List<UUID> characteristicIds = allCharacteristics.stream().map(FreeCharacteristic::getId).toList();

        Map<UUID, List<FreeCharacteristic>> characteristicsMap = allCharacteristics.stream()
                .collect(Collectors.groupingBy(fc -> fc.getCompetitor().getId()));

        Map<UUID, List<CharacteristicSource>> charSourcesMap = characteristicIds.isEmpty() ? Map.of() :
                characteristicSourceRepository.findByCharacteristicIdIn(characteristicIds).stream()
                        .collect(Collectors.groupingBy(cs -> cs.getCharacteristic().getId()));

        Map<UUID, List<RecommendationSource>> recSourcesMap = recommendationIds.isEmpty() ? Map.of() :
                recommendationSourceRepository.findByRecommendationIdIn(recommendationIds).stream()
                        .collect(Collectors.groupingBy(rs -> rs.getRecommendation().getId()));

        String ownPlaceId = userProfileRepository.findPlaceIdByUserId(userId);

        List<CompetitorDto> competitorDtos = competitors.stream()
                .map(c -> reportMapper.toCompetitorDto(c, ownPlaceId, reviewsMap, aspectsMap, characteristicsMap, charSourcesMap))
                .toList();

        List<RecommendationDto> recommendationDtos = recommendations.stream()
                .map(r -> reportMapper.toRecommendationDto(r, recSourcesMap))
                .toList();

        return reportMapper.toReportResponse(report, session, competitorDtos, recommendationDtos);
    }

    @Transactional
    public UpdateReportNameResponse updateReportName(String userId, UUID sessionId, UpdateReportNameRequest request) {
        getSessionForUser(userId, sessionId);
        AnalyticalReport report = reportRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Report not ready for session: " + sessionId));

        String trimmedName = request.reportName().trim();
        report.setName(trimmedName);

        reportRepository.save(report);

        return new UpdateReportNameResponse(sessionId, trimmedName);
    }

    /**
     * GET /api/v1/analyses/{id}/sources?competitor={compId}&aspect={name}
     * Повертає відгуки-першоджерела конкретного аспекту конкурента.
     */
    @Transactional(readOnly = true)
    public SourcesResponse getSources(String userId, UUID sessionId, UUID competitorId, Aspect aspectName) {
        getSessionForUser(userId, sessionId); // перевірка доступу

        List<AspectSentiment> sentiments = aspectSentimentRepository
                .findByReviewCompetitorIdAndCategoryName(competitorId, aspectName);

        List<ReviewSourceDto> sources = sentiments.stream()
                .filter(s -> s.getPolarity() != null && s.getPolarity() != 0)
                .map(s -> {
                    Review review = s.getReview();
                    return new ReviewSourceDto(
                            review.getId(),
                            review.getCompetitor().getName(),
                            review.getText(),
                            review.getRating(),
                            review.getCreatedAt(),
                            s.getPolarity(),
                            s.getConfidenceScore()
                    );
                })
                .toList();

        return new SourcesResponse(sources);
    }

    @Transactional(readOnly = true)
    public SourcesResponse getSourcesByReviewIds(String userId, UUID sessionId, List<UUID> reviewIds) {
        getSessionForUser(userId, sessionId);

        List<Review> reviews = reviewRepository.findAllWithCompetitorByIdIn(reviewIds);

        List<ReviewSourceDto> sources = reviews.stream()
                .map(review -> new ReviewSourceDto(
                        review.getId(),
                        review.getCompetitor().getName(),
                        review.getText(),
                        review.getRating(),
                        review.getCreatedAt(),
                        null,
                        null
                ))
                .toList();

        return new SourcesResponse(sources);
    }

    private AnalysisSession getSessionForUser(String userId, UUID sessionId) {
        AnalysisSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied to session: " + sessionId);
        }
        return session;
    }
}
