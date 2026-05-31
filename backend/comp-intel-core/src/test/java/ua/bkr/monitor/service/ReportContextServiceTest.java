package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.model.AnalyticalReport;
import ua.bkr.monitor.model.Competitor;
import ua.bkr.monitor.model.FreeCharacteristic;
import ua.bkr.monitor.model.Recommendation;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.repository.FreeCharacteristicRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportContextServiceTest {

    @Mock private FreeCharacteristicRepository freeCharacteristicRepository;
    @InjectMocks private ReportContextService service;

    @Test
    void buildReportContext_includesStatsCharacteristicsAndRecommendations() {
        UUID competitorId = UUID.randomUUID();
        Competitor competitor = new Competitor();
        competitor.setId(competitorId);
        competitor.setName("Cafe A");

        FreeCharacteristic characteristic = new FreeCharacteristic();
        characteristic.setCompetitor(competitor);
        characteristic.setText("Затишна тераса");

        Recommendation recommendation = new Recommendation();
        recommendation.setText("Додати літній майданчик");

        AnalyticalReport report = new AnalyticalReport();
        report.setGeneratedAt(LocalDateTime.of(2024, 3, 1, 9, 0));
        report.setDisclaimer("Disclaimer");
        report.setRecommendations(List.of(recommendation));

        AggregatedStatistics stats = new AggregatedStatistics(
                null,
                List.of(new AggregatedStatistics.CompetitorAspectProfile(
                        competitorId,
                        "Cafe A",
                        Map.of(
                                Aspect.SERVICE, 0.5,
                                Aspect.PRICE, -0.3
                        )
                )),
                List.of(),
                List.of(new AggregatedStatistics.PositioningPoint(
                        competitorId, "Cafe A", -0.2, 0.4
                )),
                List.of(
                        new AggregatedStatistics.CompetitorTrend(
                                competitorId,
                                "Cafe A",
                                List.of(
                                        new AggregatedStatistics.MonthlyPoint("2024-01", 0.1, 2),
                                        new AggregatedStatistics.MonthlyPoint("2024-02", 0.6, 3)
                                )
                        ),
                        new AggregatedStatistics.CompetitorTrend(
                                UUID.randomUUID(),
                                "Cafe B",
                                List.of()
                        )
                )
        );

        when(freeCharacteristicRepository.findByCompetitorIdIn(List.of(competitorId)))
                .thenReturn(List.of(characteristic));

        String context = service.buildReportContext(report, List.of(competitor), stats);

        assertThat(context).contains("АНАЛІТИЧНИЙ ЗВІТ");
        assertThat(context).contains("Дата генерації: 2024-03-01T09:00");
        assertThat(context).contains("Disclaimer: Disclaimer");
        assertThat(context).contains("Конкурент: Cafe A");
        assertThat(context).contains("Сервіс: 0,50");
        assertThat(context).contains("Ціна: -0,30");
        assertThat(context).contains("висока ціна");
        assertThat(context).contains("висока якість");
        assertThat(context).contains("тренд покращується");
        assertThat(context).contains("Cafe A:");
        assertThat(context).contains("— Затишна тераса");
        assertThat(context).contains("• Додати літній майданчик");
        assertThat(context).doesNotContain("Cafe B:");
    }
}
