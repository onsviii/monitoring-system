package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.enums.LogType;

import java.time.LocalDateTime;
import java.util.UUID;

public record LogEntryResponse(
        UUID id,
        UUID sessionId,
        LogType type,
        String detail,
        LocalDateTime timestamp
) {}
