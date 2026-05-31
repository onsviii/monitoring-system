package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.*;
import ua.bkr.monitor.dto.SourcesResponse.ReviewSourceDto;
import ua.bkr.monitor.mapper.ReportMapper;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private AnalysisSessionRepository sessionRepository;
    @Mock private AnalyticalReportRepository reportRepository;
    @Mock private CompetitorRepository competitorRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private AspectSentimentRepository aspectSentimentRepository;
    @Mock private FreeCharacteristicRepository characteristicRepository;
    @Mock private CharacteristicSourceRepository characteristicSourceRepository;
    @Mock private RecommendationRepository recommendationRepository;
    @Mock private RecommendationSourceRepository recommendationSourceRepository;
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private ReportMapper reportMapper;
    @InjectMocks private ReportService service;

    @Test
    void getReport_returnsMappedResponse() {
        String userId = "user-1";
        UUID sessionId = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();
        UUID reviewId = UUID.randomUUID();
        UUID characteristicId = UUID.randomUUID();
        UUID recommendationId = UUID.randomUUID();

        UserProfile user = new UserProfile();
        user.setId(userId);
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        session.setUser(user);

        AnalyticalReport report = new AnalyticalReport();
        report.setId(reportId);
        report.setGeneratedAt(LocalDateTime.of(2024, 2, 1, 10, 0));
        report.setAiMarked(true);
        report.setDisclaimer("Disclaimer");
        report.setName("Q1 Report");

        Competitor competitor = new Competitor();
        competitor.setId(competitorId);
        competitor.setName("Cafe A");
        competitor.setSession(session);

        Review review = new Review();
        review.setId(reviewId);
        review.setCompetitor(competitor);
        review.setText("Good coffee");
        review.setRating(5);
        review.setCreatedAt(LocalDateTime.of(2024, 1, 1, 12, 0));

        AspectCategory category = new AspectCategory();
        category.setName(Aspect.SERVICE);
        AspectSentiment sentiment = new AspectSentiment();
        sentiment.setReview(review);
        sentiment.setCategory(category);
        sentiment.setPolarity(1);
        sentiment.setConfidenceScore(0.8f);

        FreeCharacteristic characteristic = new FreeCharacteristic();
        characteristic.setId(characteristicId);
        characteristic.setCompetitor(competitor);
        characteristic.setText("Quiet terrace");

        CharacteristicSource charSource = new CharacteristicSource();
        charSource.setCharacteristic(characteristic);
        charSource.setReview(review);

        Recommendation recommendation = new Recommendation();
        recommendation.setId(recommendationId);
        recommendation.setText("Improve service");
        recommendation.setReport(report);

        RecommendationSource recSource = new RecommendationSource();
        recSource.setRecommendation(recommendation);
        recSource.setReview(review);

        CompetitorDto competitorDto = new CompetitorDto(
                competitorId, "Cafe A", "Addr", "COFFEE", 4.6, 1, false, List.of(), List.of()
        );
        RecommendationDto recommendationDto = new RecommendationDto(
                recommendationId, "Improve service", List.of(reviewId)
        );
        ReportResponse expected = new ReportResponse(
                sessionId,
                report.getName(),
                report.getGeneratedAt(),
                report.getAiMarked(),
                report.getDisclaimer(),
                report.getAggregatedStatistics(),
                List.of(competitorDto),
                List.of(recommendationDto)
        );

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(reportRepository.findBySessionId(sessionId)).thenReturn(Optional.of(report));
        when(competitorRepository.findBySessionId(sessionId)).thenReturn(List.of(competitor));
        when(recommendationRepository.findByReportId(reportId)).thenReturn(List.of(recommendation));
        when(reviewRepository.findByCompetitorIdIn(List.of(competitorId))).thenReturn(List.of(review));
        when(aspectSentimentRepository.findByReviewCompetitorIdIn(List.of(competitorId))).thenReturn(List.of(sentiment));
        when(characteristicRepository.findByCompetitorIdIn(List.of(competitorId))).thenReturn(List.of(characteristic));
        when(characteristicSourceRepository.findByCharacteristicIdIn(List.of(characteristicId))).thenReturn(List.of(charSource));
        when(recommendationSourceRepository.findByRecommendationIdIn(List.of(recommendationId))).thenReturn(List.of(recSource));
        when(userProfileRepository.findPlaceIdByUserId(userId)).thenReturn("place-1");
        when(reportMapper.toCompetitorDto(eq(competitor), eq("place-1"), anyMap(), anyMap(), anyMap(), anyMap()))
                .thenReturn(competitorDto);
        when(reportMapper.toRecommendationDto(eq(recommendation), anyMap())).thenReturn(recommendationDto);
        when(reportMapper.toReportResponse(eq(report), eq(session), anyList(), anyList())).thenReturn(expected);

        ReportResponse result = service.getReport(userId, sessionId);

        assertThat(result).isSameAs(expected);
        verify(characteristicSourceRepository).findByCharacteristicIdIn(List.of(characteristicId));
        verify(recommendationSourceRepository).findByRecommendationIdIn(List.of(recommendationId));
    }

    @Test
    void getReport_throwsWhenUserIsNotOwner() {
        UUID sessionId = UUID.randomUUID();
        UserProfile user = new UserProfile();
        user.setId("other-user");
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        session.setUser(user);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.getReport("user-1", sessionId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Access denied");
        verifyNoInteractions(reportRepository);
    }

    @Test
    void getReport_throwsWhenReportMissing() {
        String userId = "user-1";
        UUID sessionId = UUID.randomUUID();
        UserProfile user = new UserProfile();
        user.setId(userId);
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        session.setUser(user);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(reportRepository.findBySessionId(sessionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getReport(userId, sessionId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Report not ready");
    }

    @Test
    void getSources_filtersNeutralAndNullPolarity() {
        String userId = "user-1";
        UUID sessionId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();
        UserProfile user = new UserProfile();
        user.setId(userId);
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        session.setUser(user);

        Review review = new Review();
        review.setId(UUID.randomUUID());
        review.setText("Nice place");
        review.setRating(4);
        review.setCreatedAt(LocalDateTime.of(2024, 1, 5, 10, 0));

        AspectSentiment positive = new AspectSentiment();
        positive.setReview(review);
        positive.setPolarity(1);
        positive.setConfidenceScore(0.7f);

        AspectSentiment neutral = new AspectSentiment();
        neutral.setReview(review);
        neutral.setPolarity(0);

        AspectSentiment missing = new AspectSentiment();
        missing.setReview(review);
        missing.setPolarity(null);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(aspectSentimentRepository.findByReviewCompetitorIdAndCategoryName(competitorId, Aspect.SERVICE))
                .thenReturn(List.of(positive, neutral, missing));

        SourcesResponse result = service.getSources(userId, sessionId, competitorId, Aspect.SERVICE);

        assertThat(result.reviews()).containsExactly(
                new ReviewSourceDto(
                        review.getId(),
                        review.getText(),
                        review.getRating(),
                        review.getCreatedAt(),
                        1,
                        0.7f
                )
        );
    }
}
