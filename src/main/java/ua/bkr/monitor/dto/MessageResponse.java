package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.enums.ChatRole;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        ChatRole role,
        String text,
        LocalDateTime timestamp
) {}
