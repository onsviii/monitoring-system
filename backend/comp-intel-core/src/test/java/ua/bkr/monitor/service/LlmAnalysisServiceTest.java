package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.LLMInteractionLog;
import ua.bkr.monitor.model.record.ChatTurn;
import ua.bkr.monitor.model.record.ExtractedCharacteristic;
import ua.bkr.monitor.model.record.GeneratedRecommendation;
import ua.bkr.monitor.model.record.IndexedReview;
import ua.bkr.monitor.provider.LlmProvider;
import ua.bkr.monitor.repository.AnalysisSessionRepository;
import ua.bkr.monitor.repository.LLMInteractionLogRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LlmAnalysisServiceTest {

    @Mock private LlmProvider llmProvider;
    @Mock private LLMInteractionLogRepository logRepository;
    @Mock private AnalysisSessionRepository sessionRepository;

    private LlmAnalysisService service(ObjectMapper objectMapper) {
        return new LlmAnalysisService(llmProvider, objectMapper, logRepository, sessionRepository);
    }

    @Test
    void extractCharacteristics_parsesJsonAndLogs() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(llmProvider.getProviderName()).thenReturn("TestProvider");
        when(llmProvider.generate(anyList(), anyDouble()))
                .thenReturn("```json\n[{\"text\":\"Літня тераса\",\"sourceIndices\":[0]}]\n```");

        List<ExtractedCharacteristic> result = service(new ObjectMapper())
                .extractCharacteristics("Cafe", List.of(new IndexedReview(0, "Nice place")), sessionId);

        assertThat(result).containsExactly(new ExtractedCharacteristic("Літня тераса", List.of(0)));
        ArgumentCaptor<LLMInteractionLog> captor = ArgumentCaptor.forClass(LLMInteractionLog.class);
        verify(logRepository).save(captor.capture());
        assertThat(captor.getValue().getComponentType()).isEqualTo("CHARACTERISTICS [TestProvider]");
        assertThat(captor.getValue().getResponseOut()).contains("Літня тераса");
    }

    @Test
    void generateRecommendations_handlesNullStatsAndEmptyInputs() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(llmProvider.getProviderName()).thenReturn("TestProvider");
        when(llmProvider.generate(anyList(), anyDouble())).thenReturn("[]");

        List<GeneratedRecommendation> result = service(new ObjectMapper())
                .generateRecommendations("Coffee", null, List.of(), List.of(), sessionId);

        assertThat(result).isEmpty();
        verify(logRepository).save(any(LLMInteractionLog.class));
    }

    @Test
    void chat_buildsMessageHistoryAndReturnsAnswer() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(llmProvider.getProviderName()).thenReturn("TestProvider");
        when(llmProvider.generate(anyList(), anyDouble())).thenReturn("Answer");

        List<ChatTurn> history = List.of(
                new ChatTurn("user", "Hi"),
                new ChatTurn("assistant", "Hello")
        );

        String response = service(new ObjectMapper())
                .chat("What next?", "Context", history, sessionId);

        assertThat(response).isEqualTo("Answer");
        ArgumentCaptor<List<Map<String, String>>> captor = ArgumentCaptor.forClass(List.class);
        verify(llmProvider).generate(captor.capture(), anyDouble());
        List<Map<String, String>> messages = captor.getValue();
        assertThat(messages.get(0).get("role")).isEqualTo("system");
        assertThat(messages.get(messages.size() - 1).get("content")).isEqualTo("What next?");
        assertThat(messages.stream().anyMatch(m -> "assistant".equals(m.get("role")))).isTrue();
    }

    @Test
    void chat_logsErrorAndThrowsWhenProviderFails() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(llmProvider.getProviderName()).thenReturn("TestProvider");
        when(llmProvider.generate(anyList(), anyDouble())).thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> service(new ObjectMapper())
                .chat("Question", "Context", List.of(), sessionId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("TestProvider");

        ArgumentCaptor<LLMInteractionLog> captor = ArgumentCaptor.forClass(LLMInteractionLog.class);
        verify(logRepository).save(captor.capture());
        assertThat(captor.getValue().getResponseOut()).startsWith("ERROR:");
    }
}
