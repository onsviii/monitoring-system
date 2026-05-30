package ua.bkr.monitor.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ua.bkr.monitor.dto.MessageResponse;
import ua.bkr.monitor.dto.SendMessageRequest;
import ua.bkr.monitor.service.ChatService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analyses/{sessionId}/messages")
@RequiredArgsConstructor
@PreAuthorize("hasRole('BUSINESS')")
public class ChatController {
    private final ChatService chatService;

    /**
     * POST /api/v1/analyses/{sessionId}/messages — надсилання запиту до LLM.
     * Повертає 201 Created з відповіддю асистента.
     */
    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
            @AuthenticationPrincipal String userId, @PathVariable UUID sessionId,
            @Valid @RequestBody SendMessageRequest request) {

        MessageResponse response = chatService.sendMessage(userId, sessionId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/analyses/{sessionId}/messages — історія чату.
     */
    @GetMapping
    public ResponseEntity<List<MessageResponse>> getHistory(
            @AuthenticationPrincipal String userId, @PathVariable UUID sessionId) {

        List<MessageResponse> history = chatService.getHistory(userId, sessionId);
        return ResponseEntity.ok(history);
    }
}
