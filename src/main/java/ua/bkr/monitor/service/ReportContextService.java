package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.model.AnalyticalReport;
import ua.bkr.monitor.model.Competitor;
import ua.bkr.monitor.model.FreeCharacteristic;
import ua.bkr.monitor.repository.FreeCharacteristicRepository;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportContextService {
    private final FreeCharacteristicRepository freeCharacteristicRepository;

    public String buildReportContext(
            AnalyticalReport report, List<Competitor> competitors, AggregatedStatistics stats) {
        StringBuilder ctx = new StringBuilder();

        ctx.append("=== АНАЛІТИЧНИЙ ЗВІТ ===\n");
        ctx.append("Дата генерації: ").append(report.getGeneratedAt()).append("\n");
        ctx.append("Disclaimer: ").append(report.getDisclaimer()).append("\n\n");

        ctx.append("=== АСПЕКТНІ ОЦІНКИ КОНКУРЕНТІВ ===\n");
        ctx.append("Шкала від -1.0 (негативна) до +1.0 (позитивна). ");
        ctx.append("0.0 — нейтральна або відсутня оцінка.\n\n");

        for (AggregatedStatistics.CompetitorAspectProfile profile : stats.radarChart()) {
            ctx.append("Конкурент: ").append(profile.competitorName()).append("\n");
            profile.aspects().forEach((aspect, value) -> {
                String label = aspect.getDisplayName();
                ctx.append(String.format("  %s: %.2f\n", label, value));
            });
            ctx.append("\n");
        }

        ctx.append("=== ПОЗИЦІОНУВАННЯ КОНКУРЕНТІВ (ціна vs якість) ===\n");
        ctx.append("Пояснення: позиція конкурента на ринку за сприйняттям ціни та якості клієнтами.\n");
        for (AggregatedStatistics.PositioningPoint point : stats.positioningMatrix()) {
            String priceLabel = point.priceSentiment() > 0 ? "доступна ціна" : "висока ціна";
            String qualityLabel = point.qualitySentiment() > 0 ? "висока якість" : "низька якість";
            ctx.append(String.format("  %s: %s, %s (%.2f / %.2f)\n",
                    point.competitorName(),
                    priceLabel,
                    qualityLabel,
                    point.priceSentiment(),
                    point.qualitySentiment()));
        }
        ctx.append("\n");

        ctx.append("=== ДИНАМІКА ТОНАЛЬНОСТІ ПО МІСЯЦЯХ ===\n");
        ctx.append("Пояснення: як змінювалась загальна оцінка конкурента у відгуках клієнтів.\n");
        for (AggregatedStatistics.CompetitorTrend trend : stats.sentimentTrends()) {
            if (trend.points().isEmpty()) {
                continue;
            }
            AggregatedStatistics.MonthlyPoint first = trend.points().get(0);
            AggregatedStatistics.MonthlyPoint last = trend.points().get(trend.points().size() - 1);
            String direction = last.avgPolarity() > first.avgPolarity() ? "покращується" : "погіршується";
            ctx.append(String.format("  %s: тренд %s (%.2f → %.2f)\n",
                    trend.competitorName(),
                    direction,
                    first.avgPolarity(),
                    last.avgPolarity()));
        }

        ctx.append("\n");
        ctx.append("=== УНІКАЛЬНІ ХАРАКТЕРИСТИКИ КОНКУРЕНТІВ ===\n");
        ctx.append("Особливості що не вкладаються в стандартні категорії:\n");

        List<UUID> competitorIds = competitors.stream()
                .map(Competitor::getId)
                .toList();

        Map<UUID, List<FreeCharacteristic>> characteristicsByCompetitor =
                freeCharacteristicRepository.findByCompetitorIdIn(competitorIds)
                        .stream()
                        .collect(Collectors.groupingBy(fc -> fc.getCompetitor().getId()));

        for (Competitor competitor : competitors) {
            List<FreeCharacteristic> compCharacteristics =
                    characteristicsByCompetitor.getOrDefault(competitor.getId(), Collections.emptyList());

            if (compCharacteristics.isEmpty()) {
                continue;
            }

            ctx.append("  ").append(competitor.getName()).append(":\n");
            for (FreeCharacteristic fc : compCharacteristics) {
                ctx.append("    — ").append(fc.getText()).append("\n");
            }
        }

        ctx.append("\n");
        ctx.append("=== УПРАВЛІНСЬКІ РЕКОМЕНДАЦІЇ ===\n");
        if (report.getRecommendations() != null) {
            report.getRecommendations().forEach(
                    r -> ctx.append("  • ").append(r.getText()).append("\n"));
        }

        return ctx.toString();
    }
}