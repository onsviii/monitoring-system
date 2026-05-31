package ua.bkr.monitor.dto;

import java.util.UUID;

public record UpdateReportNameResponse(
        UUID sessionId,
        String reportName
) {
}
