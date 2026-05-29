package ua.bkr.monitor.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.UUID;

public record SendMessageRequest(
        @NotBlank String text
) {}
