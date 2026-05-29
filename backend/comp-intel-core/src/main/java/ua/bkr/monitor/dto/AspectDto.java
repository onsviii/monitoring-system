package ua.bkr.monitor.dto;

public record AspectDto(
        String categoryName,
        double averagePolarity,
        double averageConfidence,
        int count
) {
}
