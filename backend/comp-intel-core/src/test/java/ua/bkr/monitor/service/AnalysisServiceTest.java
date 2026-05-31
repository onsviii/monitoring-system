package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import ua.bkr.monitor.event.AnalysisCreatedEvent;
import ua.bkr.monitor.dto.*;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.mapper.AnalysisSessionMapper;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.*;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.repository.*;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalysisServiceTest {

    @Mock private UserProfileRepository userProfileRepository;
    @Mock private AnalysisSessionRepository sessionRepository;
    @Mock private NicheRepository nicheRepository;
    @Mock private PipelineOrchestrator pipelineOrchestrator;
    @Mock private AnalysisSessionMapper sessionMapper;
    @Mock private PlacesService placesService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private AnalysisService service;

    private static final String USER_ID = "user-abc";
    private static final UUID SESSION_ID = UUID.randomUUID();

    private UserProfile makeUser(String id) {
        UserProfile u = new UserProfile();
        u.setId(id);
        return u;
    }

    private AnalysisSession makeSession(UUID id, UserProfile owner, SessionStatus status, AnalysisStage stage) {
        AnalysisSession s = new AnalysisSession();
        s.setId(id);
        s.setUser(owner);
        s.setStatus(status);
        s.setStage(stage);
        s.setCompetitors(List.of());
        return s;
    }

    // ── preview ───────────────────────────────────────────────────────────────

    @Test
    void preview_throwsResourceNotFoundException_whenUserNotFound() {
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.empty());

        AnalysisPreviewRequest request = new AnalysisPreviewRequest(
            "COFFEE", new Location(50.0, 30.0), 2.0, 5
        );

        assertThatThrownBy(() -> service.preview(USER_ID, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining(USER_ID);
    }

    @Test
    void preview_delegatesToPlacesService_whenUserExists() {
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(makeUser(USER_ID)));

        AnalysisPreviewRequest request = new AnalysisPreviewRequest(
            "COFFEE", new Location(50.0, 30.0), 2.0, 5
        );
        PlaceSearchResponse expected = new PlaceSearchResponse(List.of());
        when(placesService.findCompetitors(any(), any(), anyDouble(), anyInt())).thenReturn(expected);

        PlaceSearchResponse result = service.preview(USER_ID, request);

        assertThat(result).isSameAs(expected);
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    void create_savesSessionAndPublishesEvent() {
        UserProfile user = makeUser(USER_ID);
        Niche niche = new Niche();
        niche.setCode("COFFEE");

        CreateAnalysisRequest request = new CreateAnalysisRequest(
            "COFFEE", "Report", new Location(50.0, 30.0), 2.0,
            List.of(new CreateAnalysisRequest.SelectedPlace("place-1", "Cafe", null, null))
        );

        AnalysisSession session = makeSession(SESSION_ID, user, SessionStatus.PENDING, AnalysisStage.COLLECTING_DATA);
        AnalysisStatusResponse expectedResponse = new AnalysisStatusResponse(
            SESSION_ID, AnalysisStage.COLLECTING_DATA, 20, SessionStatus.PENDING, 0
        );

        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(nicheRepository.findByCode("COFFEE")).thenReturn(Optional.of(niche));
        when(sessionMapper.toEntity(request, user, niche)).thenReturn(session);
        when(sessionRepository.save(session)).thenReturn(session);
        when(sessionMapper.toStatusResponse(session)).thenReturn(expectedResponse);

        AnalysisStatusResponse result = service.create(USER_ID, request);

        assertThat(result).isSameAs(expectedResponse);
        verify(sessionRepository).save(session);
        verify(eventPublisher).publishEvent(any(AnalysisCreatedEvent.class));
    }

    @Test
    void create_throwsResourceNotFoundException_whenUserNotFound() {
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.empty());

        CreateAnalysisRequest request = new CreateAnalysisRequest(
            "COFFEE", "Report", new Location(50.0, 30.0), 2.0,
            List.of(new CreateAnalysisRequest.SelectedPlace("place-1", "Cafe", null, null))
        );

        assertThatThrownBy(() -> service.create(USER_ID, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_throwsResourceNotFoundException_whenNicheNotFound() {
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(makeUser(USER_ID)));
        when(nicheRepository.findByCode("UNKNOWN")).thenReturn(Optional.empty());

        CreateAnalysisRequest request = new CreateAnalysisRequest(
            "UNKNOWN", "Report", new Location(50.0, 30.0), 2.0,
            List.of(new CreateAnalysisRequest.SelectedPlace("place-1", "Cafe", null, null))
        );

        assertThatThrownBy(() -> service.create(USER_ID, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── getStatus ─────────────────────────────────────────────────────────────

    @Test
    void getStatus_returnsCorrectResponse_whenUserIsOwner() {
        UserProfile user = makeUser(USER_ID);
        AnalysisSession session = makeSession(SESSION_ID, user, SessionStatus.RUNNING, AnalysisStage.CLASSIFYING);

        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        AnalysisStatusResponse result = service.getStatus(USER_ID, SESSION_ID);

        assertThat(result.getId()).isEqualTo(SESSION_ID);
        assertThat(result.getStatus()).isEqualTo(SessionStatus.RUNNING);
        assertThat(result.getStage()).isEqualTo(AnalysisStage.CLASSIFYING);
        assertThat(result.getProgress()).isEqualTo(60);
        assertThat(result.getCompetitorsCount()).isEqualTo(0);
    }

    @Test
    void getStatus_throwsRuntimeException_whenSessionNotFound() {
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getStatus(USER_ID, SESSION_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getStatus_throwsRuntimeException_whenUserNotOwner() {
        UserProfile otherUser = makeUser("another-user");
        AnalysisSession session = makeSession(SESSION_ID, otherUser, SessionStatus.RUNNING, AnalysisStage.ANONYMIZING);

        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.getStatus(USER_ID, SESSION_ID))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining(SESSION_ID.toString());
    }

    // ── retryAnalysis ─────────────────────────────────────────────────────────

    @Test
    void retryAnalysis_resumesPipelineAndResetsToPending_whenSessionIsFailed() {
        UserProfile user = makeUser(USER_ID);
        AnalysisSession session = makeSession(SESSION_ID, user, SessionStatus.FAILED, AnalysisStage.CLASSIFYING);

        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(sessionRepository.save(session)).thenReturn(session);
        when(sessionMapper.toStatusResponse(session)).thenReturn(
            new AnalysisStatusResponse(SESSION_ID, AnalysisStage.CLASSIFYING, 60, SessionStatus.PENDING, 0)
        );

        service.retryAnalysis(USER_ID, SESSION_ID);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING);
        verify(sessionRepository).save(session);
        verify(pipelineOrchestrator).resumeAsync(SESSION_ID);
    }

    @Test
    void retryAnalysis_doesNothing_whenSessionIsNotFailed() {
        UserProfile user = makeUser(USER_ID);
        AnalysisSession session = makeSession(SESSION_ID, user, SessionStatus.RUNNING, AnalysisStage.ANONYMIZING);

        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(sessionMapper.toStatusResponse(session)).thenReturn(
            new AnalysisStatusResponse(SESSION_ID, AnalysisStage.ANONYMIZING, 40, SessionStatus.RUNNING, 0)
        );

        service.retryAnalysis(USER_ID, SESSION_ID);

        verify(sessionRepository, never()).save(any());
        verify(pipelineOrchestrator, never()).resumeAsync(any());
    }
}
