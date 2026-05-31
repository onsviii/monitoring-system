package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.LogEntryResponse;
import ua.bkr.monitor.dto.MetricResponse;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.CollectionErrorLog;
import ua.bkr.monitor.model.LLMInteractionLog;
import ua.bkr.monitor.model.ModelQualityMetric;
import ua.bkr.monitor.model.enums.LogType;
import ua.bkr.monitor.repository.CollectionErrorLogRepository;
import ua.bkr.monitor.repository.LLMInteractionLogRepository;
import ua.bkr.monitor.repository.ModelQualityMetricRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonitoringServiceTest {

    @Mock private ModelQualityMetricRepository metricRepository;
    @Mock private CollectionErrorLogRepository errorLogRepository;
    @Mock private LLMInteractionLogRepository llmLogRepository;
    @InjectMocks private MonitoringService service;

    @Test
    void getMetrics_mapsMetricsFromRepository() {
        UUID metricId = UUID.randomUUID();
        LocalDateTime capturedAt = LocalDateTime.of(2024, 1, 1, 12, 0);
        ModelQualityMetric metric = new ModelQualityMetric(
                metricId, "accuracy", 0.95f, "v1", capturedAt
        );
        when(metricRepository.findAllByOrderByCapturedAtDesc()).thenReturn(List.of(metric));

        List<MetricResponse> result = service.getMetrics();

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEqualTo(new MetricResponse(
                metricId, "accuracy", 0.95f, "v1", capturedAt
        ));
    }

    @Test
    void getLogs_returnsCollectionLogs() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = sessionWithId(sessionId);
        CollectionErrorLog log = new CollectionErrorLog(
                UUID.randomUUID(), session, "IO_ERROR", "Timeout", LocalDateTime.of(2024, 2, 1, 10, 0)
        );
        when(errorLogRepository.findAllByOrderByTimestampDesc()).thenReturn(List.of(log));

        List<LogEntryResponse> result = service.getLogs(LogType.COLLECTION);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(LogType.COLLECTION);
        assertThat(result.get(0).detail()).isEqualTo("IO_ERROR: Timeout");
        assertThat(result.get(0).sessionId()).isEqualTo(sessionId);
    }

    @Test
    void getLogs_returnsLlmLogsWithTruncatedPrompt() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = sessionWithId(sessionId);
        String longPrompt = "x".repeat(510);
        LLMInteractionLog log = new LLMInteractionLog(
                UUID.randomUUID(), session, "summarizer", longPrompt, "out", LocalDateTime.of(2024, 3, 1, 9, 0)
        );
        when(llmLogRepository.findAllByOrderByTimestampDesc()).thenReturn(List.of(log));

        List<LogEntryResponse> result = service.getLogs(LogType.LLM);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(LogType.LLM);
        assertThat(result.get(0).detail()).isEqualTo(
                "summarizer | " + longPrompt.substring(0, 500) + "…"
        );
    }

    @Test
    void getLogs_combinesAndSortsAllTypesWhenTypeIsNull() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = sessionWithId(sessionId);
        CollectionErrorLog errorLog = new CollectionErrorLog(
                UUID.randomUUID(), session, "IO_ERROR", "Timeout", LocalDateTime.of(2024, 1, 10, 10, 0)
        );
        LLMInteractionLog llmLog = new LLMInteractionLog(
                UUID.randomUUID(), session, "qa", "short", "out", LocalDateTime.of(2024, 2, 10, 10, 0)
        );
        when(errorLogRepository.findAllByOrderByTimestampDesc()).thenReturn(List.of(errorLog));
        when(llmLogRepository.findAllByOrderByTimestampDesc()).thenReturn(List.of(llmLog));

        List<LogEntryResponse> result = service.getLogs(null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).type()).isEqualTo(LogType.LLM);
        assertThat(result.get(1).type()).isEqualTo(LogType.COLLECTION);
        assertThat(result.get(0).timestamp()).isAfter(result.get(1).timestamp());
    }

    private AnalysisSession sessionWithId(UUID id) {
        AnalysisSession session = new AnalysisSession();
        session.setId(id);
        return session;
    }
}
