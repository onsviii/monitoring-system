package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.dto.AggregatedStatistics.*;
import ua.bkr.monitor.model.AspectSentiment;
import ua.bkr.monitor.model.Competitor;
import ua.bkr.monitor.model.Review;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.repository.AspectSentimentRepository;
import ua.bkr.monitor.repository.CompetitorRepository;
import ua.bkr.monitor.repository.ReviewRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsAggregator {
    private final CompetitorRepository competitorRepository;
    private final ReviewRepository reviewRepository;
    private final AspectSentimentRepository aspectSentimentRepository;

    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final int SHRINKAGE_PSEUDOCOUNT = 5;

    public AggregatedStatistics aggregate(UUID sessionId) {
        List<Competitor> competitors = competitorRepository.findBySessionId(sessionId);
        List<Review> allReviews = reviewRepository.findByCompetitorSessionId(sessionId);

        Map<UUID, List<AspectSentiment>> sentimentsByCompetitor = new HashMap<>();
        for (Competitor c : competitors) {
            sentimentsByCompetitor.put(
                    c.getId(),
                    aspectSentimentRepository.findByReviewCompetitorId(c.getId())
            );
        }

        return new AggregatedStatistics(
                buildSummary(competitors, allReviews),
                buildRadarChart(competitors, sentimentsByCompetitor),
                buildHeatmap(competitors, sentimentsByCompetitor),
                buildPositioningMatrix(competitors, sentimentsByCompetitor),
                buildSentimentTrends(competitors, sentimentsByCompetitor, allReviews)
        );
    }

    private SummaryMetrics buildSummary(List<Competitor> competitors, List<Review> reviews) {
        LocalDate earliest = reviews.stream()
                .map(r -> r.getCreatedAt().toLocalDate())
                .min(Comparator.naturalOrder())
                .orElse(null);

        LocalDate latest = reviews.stream()
                .map(r -> r.getCreatedAt().toLocalDate())
                .max(Comparator.naturalOrder())
                .orElse(null);

        return new SummaryMetrics(
                competitors.size(),
                reviews.size(),
                earliest,
                latest
        );
    }

    private List<CompetitorAspectProfile> buildRadarChart(
            List<Competitor> competitors,
            Map<UUID, List<AspectSentiment>> sentimentsByCompetitor
    ) {
        return competitors.stream()
                .map(c -> new CompetitorAspectProfile(
                        c.getId(),
                        c.getName(),
                        computeAspectAverages(sentimentsByCompetitor.getOrDefault(c.getId(), List.of()), false)
                ))
                .toList();
    }

    private List<HeatmapRow> buildHeatmap(
            List<Competitor> competitors,
            Map<UUID, List<AspectSentiment>> sentimentsByCompetitor
    ) {
        return competitors.stream()
                .map(c -> new HeatmapRow(
                        c.getId(),
                        c.getName(),
                        computeAspectAverages(sentimentsByCompetitor.getOrDefault(c.getId(), List.of()), true)
                ))
                .toList();
    }

    private List<PositioningPoint> buildPositioningMatrix(
            List<Competitor> competitors,
            Map<UUID, List<AspectSentiment>> sentimentsByCompetitor
    ) {
        return competitors.stream()
                .map(c -> {
                    Map<Aspect, Double> avgs = computeAspectAverages(
                            sentimentsByCompetitor.getOrDefault(c.getId(), List.of()), false);
                    return new PositioningPoint(
                            c.getId(),
                            c.getName(),
                            avgs.getOrDefault(Aspect.PRICE, 0.0),
                            avgs.getOrDefault(Aspect.PRODUCT_QUALITY, 0.0)
                    );
                })
                .toList();
    }

    private List<CompetitorTrend> buildSentimentTrends(
            List<Competitor> competitors,
            Map<UUID, List<AspectSentiment>> sentimentsByCompetitor,
            List<Review> allReviews) {

        Map<UUID, LocalDate> reviewDates = allReviews.stream()
                .collect(Collectors.toMap(Review::getId, r -> r.getCreatedAt().toLocalDate()));

        return competitors.stream()
                .map(c -> new CompetitorTrend(
                        c.getId(),
                        c.getName(),
                        buildSmoothedTrend(
                                sentimentsByCompetitor.getOrDefault(c.getId(), List.of()),
                                reviewDates)))
                .toList();
    }

    private List<MonthlyPoint> buildSmoothedTrend(
            List<AspectSentiment> sentiments,
            Map<UUID, LocalDate> reviewDates) {

        record Obs(YearMonth month, int polarity, UUID reviewId) {}

        List<Obs> observations = sentiments.stream()
                .filter(s -> s.getPolarity() != null && s.getPolarity() != 0)
                .map(s -> {
                    LocalDate d = reviewDates.get(s.getReview().getId());
                    return d == null ? null
                            : new Obs(YearMonth.from(d), s.getPolarity(), s.getReview().getId());
                })
                .filter(Objects::nonNull)
                .toList();

        if (observations.isEmpty()) return List.of();

        // Empirical-Bayes prior: середня тональність конкурента за весь період
        double prior = observations.stream()
                .mapToInt(Obs::polarity)
                .average()
                .orElse(0.0);

        // Один прохід по місяцях: сума, лічильник, унікальні reviewId
        Map<YearMonth, MonthAccumulator> byMonth = new TreeMap<>();
        for (Obs o : observations) {
            byMonth.computeIfAbsent(o.month(), m -> new MonthAccumulator())
                    .add(o.polarity(), o.reviewId());
        }

        List<MonthlyPoint> points = new ArrayList<>(byMonth.size());
        for (Map.Entry<YearMonth, MonthAccumulator> e : byMonth.entrySet()) {
            MonthAccumulator acc = e.getValue();
            int n = acc.count;
            double rawMean = (double) acc.polaritySum / n;

            // Posterior mean (Bayesian shrinkage)
            double smoothed = (n * rawMean + SHRINKAGE_PSEUDOCOUNT * prior)
                    / (n + SHRINKAGE_PSEUDOCOUNT);

            points.add(new MonthlyPoint(
                    e.getKey().format(MONTH_FORMAT),
                    Math.round(smoothed * 100.0) / 100.0,
                    acc.reviewIds.size()
            ));
        }
        return points;
    }

    private static final class MonthAccumulator {
        int polaritySum = 0;
        int count = 0;
        final Set<UUID> reviewIds = new HashSet<>();

        void add(int polarity, UUID reviewId) {
            polaritySum += polarity;
            count++;
            reviewIds.add(reviewId);
        }
    }


    private Map<Aspect, Double> computeAspectAverages(List<AspectSentiment> sentiments, boolean nullableForEmpty) {
        Map<Aspect, List<Integer>> grouped = groupPolaritiesByAspect(sentiments);

        Map<Aspect, Double> result = new LinkedHashMap<>();
        for (Aspect aspect : Aspect.values()) {
            List<Integer> polarities = grouped.getOrDefault(aspect, List.of());

            if (polarities.isEmpty()) {
                result.put(aspect, nullableForEmpty ? null : 0.0);
                continue;
            }

            double avg = polarities.stream()
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(0.0);

            result.put(aspect, Math.round(avg * 100.0) / 100.0);
        }
        return result;
    }

    private Map<Aspect, List<Integer>> groupPolaritiesByAspect(List<AspectSentiment> sentiments) {
        return sentiments.stream()
                .filter(s -> s.getPolarity() != null && s.getPolarity() != 0)
                .collect(Collectors.groupingBy(
                        s -> s.getCategory().getName(),
                        Collectors.mapping(AspectSentiment::getPolarity, Collectors.toList())
                ));
    }
}
