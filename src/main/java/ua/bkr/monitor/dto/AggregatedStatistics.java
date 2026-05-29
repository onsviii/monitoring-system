package ua.bkr.monitor.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AggregatedStatistics(
        SummaryMetrics summary,
        List<CompetitorAspectProfile> radarChart,
        List<HeatmapRow> heatmap,
        List<PositioningPoint> positioningMatrix,
        List<CompetitorTrend> sentimentTrends

) {

    public record SummaryMetrics(
            int competitorCount,
            int totalReviewCount,
            LocalDate earliestReviewDate,
            LocalDate latestReviewDate
    ) {}

    /**
     * Radar Chart — один багатокутник на конкурента.
     * Кожен аспект має значення від -1.0 (повністю негативний) до +1.0 (повністю позитивний).
     * Обчислюється як середнє polarity по AspectSentiment (де polarity ≠ 0, тобто аспект згадується).
     */
    public record CompetitorAspectProfile(
            UUID competitorId,
            String competitorName,
            Map<String, Double> aspects
    ) {}

    /**
     * Gap Analysis Heatmap — одна комірка для кожної пари (конкурент, аспект).
     * Значення — середня полярність. null якщо аспект не згадується жодним відгуком.
     * Фронтенд кодує: зелений (> 0), червоний (< 0), сірий (null — ринкова можливість).
     */
    public record HeatmapRow(
            UUID competitorId,
            String competitorName,
            Map<String, Double> aspects
    ) {}

    /**
     * Competitive Positioning Matrix — точка на двовимірній площині.
     * X = середня тональність аспекту "price" (ціновий сегмент).
     * Y = середня тональність аспекту "product_quality" (сприйняття якості).
     * Конкуренти без згадок price або quality отримують 0.0.
     */
    public record PositioningPoint(
            UUID competitorId,
            String competitorName,
            double priceSentiment,
            double qualitySentiment
    ) {}

    /**
     * Sentiment Trend — динаміка загальної тональності конкурента по місяцях.
     * Обчислюється як середнє polarity по ВСІХ аспектах (де polarity ≠ 0) за місяць.
     */
    public record CompetitorTrend(
            UUID competitorId,
            String competitorName,
            List<MonthlyPoint> points
    ) {}

    public record MonthlyPoint(
            String month,
            double avgPolarity,
            int reviewCount
    ) {}
}
