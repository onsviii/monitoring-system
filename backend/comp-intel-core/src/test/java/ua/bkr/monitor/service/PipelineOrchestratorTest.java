package ua.bkr.monitor.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.provider.dto.AspectClassification;
import ua.bkr.monitor.dto.CreateAnalysisRequest;
import ua.bkr.monitor.exception.DataCollectionException;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.AnalysisStage;
import ua.bkr.monitor.model.enums.CollectionErrorType;
import ua.bkr.monitor.model.enums.SessionStatus;
import ua.bkr.monitor.model.record.ExtractedCharacteristic;
import ua.bkr.monitor.model.record.GeneratedRecommendation;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.provider.GooglePlacesClient;
import ua.bkr.monitor.provider.MlServiceClient;
import ua.bkr.monitor.provider.dto.AspectResult;
import ua.bkr.monitor.repository.*;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PipelineOrchestratorTest {

    @Mock private AnalysisSessionRepository sessionRepository;
    @Mock private CompetitorRepository competitorRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private AspectSentimentRepository aspectSentimentRepository;
    @Mock private FreeCharacteristicRepository freeCharacteristicRepository;
    @Mock private StatisticsAggregator statisticsAggregator;
    @Mock private GooglePlacesClient googlePlacesClient;
    @Mock private MlServiceClient mlServiceClient;
    @Mock private LlmAnalysisService llmAnalysisService;
    @Mock private CollectionErrorLogRepository errorLogRepository;
    @Mock private AnalyticalReportRepository reportRepository;
    @Mock private AspectCategoryRepository aspectCategoryRepository;
    @Mock private CharacteristicSourceRepository characteristicSourceRepository;
    @Mock private CollectionErrorLogRepository collectionErrorLogRepository;
    @Mock private RecommendationRepository recommendationRepository;
    @Mock private RecommendationSourceRepository recommendationSourceRepository;
    private PipelineOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        orchestrator = new PipelineOrchestrator(
                sessionRepository,
                competitorRepository,
                reviewRepository,
                aspectSentimentRepository,
                freeCharacteristicRepository,
                statisticsAggregator,
                googlePlacesClient,
                mlServiceClient,
                llmAnalysisService,
                errorLogRepository,
                reportRepository,
                aspectCategoryRepository,
                characteristicSourceRepository,
                collectionErrorLogRepository,
                recommendationRepository,
                recommendationSourceRepository
        );
    }

    @Test
    void runAsync_completesPipelineAndPersistsSources() {
        UUID sessionId = UUID.randomUUID();
        UserProfile user = new UserProfile();
        user.setId("user-1");
        user.setGooglePlaceId("place-1");
        Niche niche = new Niche();
        niche.setDisplayName("Coffee");

        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        session.setUser(user);
        session.setBusinessNiche(niche);
        session.setReportName("Report");

        CreateAnalysisRequest request = new CreateAnalysisRequest(
                "COFFEE",
                "Report",
                new Location(50.0, 30.0),
                2.0,
                List.of(
                        new CreateAnalysisRequest.SelectedPlace("place-1", "Cafe A", "Addr", 4.5),
                        new CreateAnalysisRequest.SelectedPlace("place-2", "Cafe B", "Addr2", 4.1)
                )
        );

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<Competitor> storedCompetitors = new ArrayList<>();
        doAnswer(invocation -> {
            List<Competitor> competitors = invocation.getArgument(0);
            for (Competitor c : competitors) {
                if (c.getId() == null) {
                    c.setId(UUID.randomUUID());
                }
            }
            storedCompetitors.clear();
            storedCompetitors.addAll(competitors);
            return competitors;
        }).when(competitorRepository).saveAll(anyList());

        when(competitorRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(competitorRepository.findBySessionId(sessionId)).thenAnswer(invocation -> List.copyOf(storedCompetitors));

        when(googlePlacesClient.fetchReviews(eq("place-1"), eq(sessionId)))
                .thenReturn(List.of(new GooglePlacesClient.RawReview("text", 5, "bad-date")));
        when(googlePlacesClient.fetchReviews(eq("place-2"), eq(sessionId)))
                .thenThrow(new DataCollectionException(CollectionErrorType.REVIEW_FETCH_FAILED, "place-2", "fail"));

        when(mlServiceClient.anonymize(anyList())).thenAnswer(invocation -> {
            List<String> texts = invocation.getArgument(0);
            List<String> out = new ArrayList<>();
            for (String t : texts) {
                out.add("anon " + t);
            }
            return out;
        });

        when(mlServiceClient.classify(anyList())).thenAnswer(invocation -> {
            List<String> texts = invocation.getArgument(0);
            if (texts.isEmpty()) {
                return List.of();
            }
            Map<ua.bkr.monitor.model.enums.Aspect, AspectResult> aspects = Map.of(
                    ua.bkr.monitor.model.enums.Aspect.SERVICE, new AspectResult(1, 0.9f),
                    ua.bkr.monitor.model.enums.Aspect.PRICE, new AspectResult(-1, 0.6f)
            );
            return List.of(new AspectClassification(aspects));
        });

        when(aspectCategoryRepository.findByName(any())).thenAnswer(invocation -> {
            ua.bkr.monitor.model.enums.Aspect aspect = invocation.getArgument(0);
            AspectCategory category = new AspectCategory();
            category.setName(aspect);
            return Optional.of(category);
        });

        List<Review> savedReviews = new ArrayList<>();
        when(reviewRepository.save(any())).thenAnswer(invocation -> {
            Review review = invocation.getArgument(0);
            review.setId(UUID.randomUUID());
            savedReviews.add(review);
            return review;
        });
        when(reviewRepository.findByCompetitorSessionId(sessionId)).thenAnswer(invocation -> List.copyOf(savedReviews));

        when(freeCharacteristicRepository.save(any())).thenAnswer(invocation -> {
            FreeCharacteristic fc = invocation.getArgument(0);
            fc.setId(UUID.randomUUID());
            return fc;
        });

        when(llmAnalysisService.extractCharacteristics(anyString(), anyList(), eq(sessionId)))
                .thenReturn(
                        List.of(new ExtractedCharacteristic("Nice patio", List.of(0, 5))),
                        List.of()
                );

        when(statisticsAggregator.aggregate(sessionId)).thenReturn(new AggregatedStatistics(
                null, List.of(), List.of(), List.of(), List.of()
        ));

        when(llmAnalysisService.generateRecommendations(eq("Coffee"), any(), anyList(), anyList(), eq(sessionId)))
                .thenReturn(List.of(new GeneratedRecommendation("Improve service", List.of(0, 99))));

        when(reportRepository.save(any())).thenAnswer(invocation -> {
            AnalyticalReport report = invocation.getArgument(0);
            report.setId(UUID.randomUUID());
            return report;
        });
        when(recommendationRepository.save(any())).thenAnswer(invocation -> {
            Recommendation rec = invocation.getArgument(0);
            rec.setId(UUID.randomUUID());
            return rec;
        });

        orchestrator.runAsync(sessionId, request);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(session.getStage()).isNull();
        verify(competitorRepository).save(argThat(Competitor::isOwnBusiness));
        verify(collectionErrorLogRepository).save(any(CollectionErrorLog.class));
        verify(characteristicSourceRepository, times(1)).save(any(CharacteristicSource.class));
        verify(recommendationSourceRepository, times(1)).save(any(RecommendationSource.class));
        verify(aspectSentimentRepository, times(2)).save(any(AspectSentiment.class));
        verify(errorLogRepository, never()).save(any(CollectionErrorLog.class));
    }

    @Test
    void resumeAsync_failsSessionWhenNoCompetitors() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        session.setStage(AnalysisStage.COLLECTING_DATA);
        session.setStatus(SessionStatus.FAILED);
        UserProfile user = new UserProfile();
        user.setId("user-1");
        session.setUser(user);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(competitorRepository.findBySessionId(sessionId)).thenReturn(List.of());

        orchestrator.resumeAsync(sessionId);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.FAILED);
        ArgumentCaptor<CollectionErrorLog> captor = ArgumentCaptor.forClass(CollectionErrorLog.class);
        verify(errorLogRepository).save(captor.capture());
        assertThat(captor.getValue().getErrorType()).isEqualTo(CollectionErrorType.SEARCH_FAILED.name());
    }
}
