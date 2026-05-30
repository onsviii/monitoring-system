package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.enums.Aspect;

public record AspectDto(
        Aspect aspect,
        double averagePolarity,
        double averageConfidence,
        int count
) {
}
