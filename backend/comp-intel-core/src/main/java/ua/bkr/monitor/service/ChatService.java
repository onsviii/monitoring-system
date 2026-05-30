package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.dto.MessageResponse;
import ua.bkr.monitor.dto.SendMessageRequest;
import ua.bkr.monitor.exception.AccessDeniedException;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.mapper.ChatMessageMapper;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.AnalyticalReport;
import ua.bkr.monitor.model.ChatMessage;
import ua.bkr.monitor.model.Competitor;
import ua.bkr.monitor.model.enums.ChatRole;
import ua.bkr.monitor.repository.AnalysisSessionRepository;
import ua.bkr.monitor.repository.AnalyticalReportRepository;
import ua.bkr.monitor.repository.CompetitorRepository;
import ua.bkr.monitor.repository.DialogueMessageRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final AnalysisSessionRepository sessionRepository;
    private final AnalyticalReportRepository reportRepository;
    private final DialogueMessageRepository messageRepository;
    private final CompetitorRepository competitorRepository;
    private final ReportContextService reportContextService;
    private final LlmAnalysisService llmAnalysisService;
    private final ChatMessageMapper messageMapper;

    @Transactional
    public MessageResponse sendMessage(String userId, UUID sessionId, SendMessageRequest request) {
        AnalysisSession session = getSessionForUser(userId, sessionId);

        ChatMessage userMsg = buildMessage(session, ChatRole.USER, request.text());
        List<ChatMessage> history = messageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
        history.add(userMsg);

        AnalyticalReport report = reportRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Report not found for session: " + sessionId));

        List<Competitor> competitors = competitorRepository.findBySessionId(sessionId);
        AggregatedStatistics stats = report.getAggregatedStatistics();
        String reportContext = reportContextService.buildReportContext(report, competitors, stats);

        String llmResponse = llmAnalysisService.chat(
                request.text(),
                reportContext,
                history.stream().map(messageMapper::toChatTurn).toList(),
                sessionId
        );

        ChatMessage aiMsg = buildMessage(session, ChatRole.ASSISTANT, llmResponse);
        messageRepository.saveAll(List.of(userMsg, aiMsg));

        return messageMapper.toMessageResponse(aiMsg);
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(String userId, UUID sessionId) {
        getSessionForUser(userId, sessionId);

        return messageRepository.findBySessionIdOrderByTimestampAsc(sessionId)
                .stream()
                .map(m -> new MessageResponse(m.getId(), m.getRole(), m.getText(), m.getTimestamp()))
                .toList();
    }

    private ChatMessage buildMessage(AnalysisSession session, ChatRole role, String text) {
        ChatMessage msg = new ChatMessage();
        msg.setSession(session);
        msg.setRole(role);
        msg.setText(text);
        msg.setTimestamp(LocalDateTime.now());
        return msg;
    }

    private AnalysisSession getSessionForUser(String userId, UUID sessionId) {
        AnalysisSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (!session.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Access denied to session: " + sessionId);
        }

        return session;
    }
}