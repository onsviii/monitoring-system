package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.bkr.monitor.dto.LogEntryResponse;
import ua.bkr.monitor.dto.MetricResponse;
import ua.bkr.monitor.model.enums.LogType;
import ua.bkr.monitor.repository.CollectionErrorLogRepository;
import ua.bkr.monitor.repository.LLMInteractionLogRepository;
import ua.bkr.monitor.repository.ModelQualityMetricRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MonitoringService {
    private final ModelQualityMetricRepository metricRepository;
    private final CollectionErrorLogRepository errorLogRepository;
    private final LLMInteractionLogRepository llmLogRepository;

    @Transactional(readOnly = true)
    public List<MetricResponse> getMetrics() {
        return metricRepository.findAllByOrderByCapturedAtDesc()
                .stream()
                .map(m -> new MetricResponse(
                        m.getId(),
                        m.getMetricName(),
                        m.getValue(),
                        m.getModelVersion(),
                        m.getCapturedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LogEntryResponse> getLogs(LogType type) {

        if (LogType.COLLECTION.equals(type)) {
            return errorLogRepository.findAllByOrderByTimestampDesc()
                    .stream()
                    .map(log -> new LogEntryResponse(
                            log.getId(),
                            log.getSession().getId(),
                            LogType.COLLECTION,
                            log.getErrorType() + ": " + log.getDescription(),
                            log.getTimestamp()
                    ))
                    .toList();
        }

        if (LogType.LLM.equals(type)) {
            return llmLogRepository.findAllByOrderByTimestampDesc()
                    .stream()
                    .map(log -> new LogEntryResponse(
                            log.getId(),
                            log.getSession().getId(),
                            LogType.LLM,
                            log.getComponentType() + " | " +
                                    truncate(log.getPromptIn(), 500),
                            log.getTimestamp()
                    ))
                    .toList();
        }

        List<LogEntryResponse> all = new ArrayList<>();
        all.addAll(getLogs(LogType.COLLECTION));
        all.addAll(getLogs(LogType.LLM));
        all.sort(Comparator.comparing(LogEntryResponse::timestamp).reversed());
        return all;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength) + "…" : text;
    }
}
