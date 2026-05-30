package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.bkr.monitor.dto.AnalysisStatusResponse;
import ua.bkr.monitor.dto.CreateAnalysisRequest;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.mapper.AnalysisSessionMapper;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.model.UserProfile;
import ua.bkr.monitor.repository.AnalysisSessionRepository;
import ua.bkr.monitor.repository.NicheRepository;
import ua.bkr.monitor.repository.UserProfileRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalysisService {
    private final UserProfileRepository userProfileRepository;
    private final AnalysisSessionRepository sessionRepository;
    private final NicheRepository nicheRepository;
    private final PipelineOrchestrator pipelineOrchestrator;
    private final AnalysisSessionMapper sessionMapper;

    @Transactional
    public AnalysisStatusResponse create(String userId, CreateAnalysisRequest request) {
        UserProfile user = userProfileRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Niche niche = nicheRepository.findByCode(request.nicheCode())
                .orElseThrow(() -> new ResourceNotFoundException("Niche not supported: " + request.nicheCode()));

        AnalysisSession session = sessionMapper.toEntity(request, user, niche);
        session = sessionRepository.save(session);
        pipelineOrchestrator.runAsync(session.getId(), request);

        return sessionMapper.toStatusResponse(session);
    }

    @Transactional(readOnly = true)
    public AnalysisStatusResponse getStatus(String userId, UUID sessionId) {
        AnalysisSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied to session: " + sessionId);
        }

        return new AnalysisStatusResponse(session.getId(), session.getStatus());
    }
}
