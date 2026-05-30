package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.MessageResponse;
import ua.bkr.monitor.dto.SendMessageRequest;
import ua.bkr.monitor.exception.AccessDeniedException;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.mapper.ChatMessageMapper;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.ChatRole;
import ua.bkr.monitor.repository.*;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private AnalysisSessionRepository sessionRepository;
    @Mock private AnalyticalReportRepository reportRepository;
    @Mock private DialogueMessageRepository messageRepository;
    @Mock private CompetitorRepository competitorRepository;
    @Mock private ReportContextService reportContextService;
    @Mock private LlmAnalysisService llmAnalysisService;
    @Mock private ChatMessageMapper messageMapper;
    @InjectMocks private ChatService chatService;

    private static final String USER_ID = "user-xyz";
    private static final UUID SESSION_ID = UUID.randomUUID();

    private AnalysisSession sessionOwnedBy(String ownerId) {
        UserProfile user = new UserProfile();
        user.setId(ownerId);
        AnalysisSession session = new AnalysisSession();
        session.setId(SESSION_ID);
        session.setUser(user);
        return session;
    }

    // ── sendMessage ───────────────────────────────────────────────────────────

    @Test
    void sendMessage_throwsResourceNotFoundException_whenSessionNotFound() {
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
            chatService.sendMessage(USER_ID, SESSION_ID, new SendMessageRequest("Hello")))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void sendMessage_throwsAccessDeniedException_whenUserNotOwner() {
        when(sessionRepository.findById(SESSION_ID))
            .thenReturn(Optional.of(sessionOwnedBy("other-user")));

        assertThatThrownBy(() ->
            chatService.sendMessage(USER_ID, SESSION_ID, new SendMessageRequest("Hello")))
            .isInstanceOf(AccessDeniedException.class);
    }

    // ── getHistory ────────────────────────────────────────────────────────────

    @Test
    void getHistory_throwsResourceNotFoundException_whenSessionNotFound() {
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.getHistory(USER_ID, SESSION_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getHistory_throwsAccessDeniedException_whenUserNotOwner() {
        when(sessionRepository.findById(SESSION_ID))
            .thenReturn(Optional.of(sessionOwnedBy("other-user")));

        assertThatThrownBy(() -> chatService.getHistory(USER_ID, SESSION_ID))
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getHistory_returnsMessagesInChronologicalOrder() {
        AnalysisSession session = sessionOwnedBy(USER_ID);
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        ChatMessage m1 = chatMessage(UUID.randomUUID(), ChatRole.USER, "Hello", LocalDateTime.of(2024, 1, 1, 10, 0));
        ChatMessage m2 = chatMessage(UUID.randomUUID(), ChatRole.ASSISTANT, "Hi!", LocalDateTime.of(2024, 1, 1, 10, 1));
        when(messageRepository.findBySessionIdOrderByTimestampAsc(SESSION_ID)).thenReturn(List.of(m1, m2));

        List<MessageResponse> result = chatService.getHistory(USER_ID, SESSION_ID);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).role()).isEqualTo(ChatRole.USER);
        assertThat(result.get(0).text()).isEqualTo("Hello");
        assertThat(result.get(1).role()).isEqualTo(ChatRole.ASSISTANT);
        assertThat(result.get(1).text()).isEqualTo("Hi!");
    }

    @Test
    void getHistory_returnsEmptyList_whenNoMessages() {
        AnalysisSession session = sessionOwnedBy(USER_ID);
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(messageRepository.findBySessionIdOrderByTimestampAsc(SESSION_ID)).thenReturn(List.of());

        List<MessageResponse> result = chatService.getHistory(USER_ID, SESSION_ID);

        assertThat(result).isEmpty();
    }

    private ChatMessage chatMessage(UUID id, ChatRole role, String text, LocalDateTime timestamp) {
        ChatMessage m = new ChatMessage();
        m.setId(id);
        m.setRole(role);
        m.setText(text);
        m.setTimestamp(timestamp);
        return m;
    }
}
