package ua.bkr.monitor.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateReportNameRequest(
        @NotBlank String reportName
) {
}
