package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.repository.AspectSentimentRepository;
import ua.bkr.monitor.repository.CompetitorRepository;
import ua.bkr.monitor.repository.ReviewRepository;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatisticsAggregatorTest {

    @Mock private CompetitorRepository competitorRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private AspectSentimentRepository aspectSentimentRepository;
    @InjectMocks private StatisticsAggregator aggregator;

    private final UUID SESSION_ID = UUID.randomUUID();
    private final UUID COMP_ID = UUID.randomUUID();

    private Competitor makeCompetitor(UUID id, String name) {
        Competitor c = new Competitor();
        c.setId(id);
        c.setName(name);
        return c;
    }

    private Review makeReview(UUID id, LocalDateTime at, Competitor c) {
        Review r = new Review();
        r.setId(id);
        r.setCreatedAt(at);
        r.setCompetitor(c);
        return r;
    }

    private AspectSentiment makeSentiment(Review r, Aspect aspect, int polarity) {
        AspectCategory cat = new AspectCategory();
        cat.setName(aspect);
        AspectSentiment s = new AspectSentiment();
        s.setId(UUID.randomUUID());
        s.setReview(r);
        s.setCategory(cat);
        s.setPolarity(polarity);
        return s;
    }

    // ── summary ──────────────────────────────────────────────────────────────

    @Test
    void summary_countsCompetitorsAndReviews() {
        Competitor c = makeCompetitor(COMP_ID, "Cafe A");
        Review r1 = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 1, 10, 0, 0), c);
        Review r2 = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 6, 20, 0, 0), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r1, r2));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of());

        AggregatedStatistics result = aggregator.aggregate(SESSION_ID);

        assertThat(result.summary().competitorCount()).isEqualTo(1);
        assertThat(result.summary().totalReviewCount()).isEqualTo(2);
        assertThat(result.summary().earliestReviewDate()).isEqualTo(r1.getCreatedAt().toLocalDate());
        assertThat(result.summary().latestReviewDate()).isEqualTo(r2.getCreatedAt().toLocalDate());
    }

    @Test
    void summary_nullDatesWhenNoReviews() {
        Competitor c = makeCompetitor(COMP_ID, "Empty Cafe");
        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of());
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of());

        AggregatedStatistics result = aggregator.aggregate(SESSION_ID);

        assertThat(result.summary().earliestReviewDate()).isNull();
        assertThat(result.summary().latestReviewDate()).isNull();
    }

    // ── radar chart ──────────────────────────────────────────────────────────

    @Test
    void radarChart_averagesPolarityPerAspect() {
        Competitor c = makeCompetitor(COMP_ID, "Bistro");
        Review r = makeReview(UUID.randomUUID(), LocalDateTime.now(), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r, Aspect.SERVICE, 1),
            makeSentiment(r, Aspect.SERVICE, -1),
            makeSentiment(r, Aspect.PRODUCT_QUALITY, 1)
        ));

        Map<Aspect, Double> aspects = aggregator.aggregate(SESSION_ID).radarChart().get(0).aspects();

        assertThat(aspects.get(Aspect.SERVICE)).isEqualTo(0.0);
        assertThat(aspects.get(Aspect.PRODUCT_QUALITY)).isEqualTo(1.0);
    }

    @Test
    void radarChart_zeroForAspectsWithNoData() {
        Competitor c = makeCompetitor(COMP_ID, "Salon");
        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of());
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of());

        Map<Aspect, Double> aspects = aggregator.aggregate(SESSION_ID).radarChart().get(0).aspects();

        for (Aspect aspect : Aspect.values()) {
            assertThat(aspects.get(aspect)).isEqualTo(0.0);
        }
    }

    @Test
    void radarChart_filtersNeutralPolarity() {
        Competitor c = makeCompetitor(COMP_ID, "Pub");
        Review r = makeReview(UUID.randomUUID(), LocalDateTime.now(), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r, Aspect.SERVICE, 0)
        ));

        // polarity=0 excluded from average → treated as no data → 0.0 for radar
        Map<Aspect, Double> aspects = aggregator.aggregate(SESSION_ID).radarChart().get(0).aspects();
        assertThat(aspects.get(Aspect.SERVICE)).isEqualTo(0.0);
    }

    // ── heatmap ──────────────────────────────────────────────────────────────

    @Test
    void heatmap_nullForAspectsWithNoMentions() {
        Competitor c = makeCompetitor(COMP_ID, "Bar");
        Review r = makeReview(UUID.randomUUID(), LocalDateTime.now(), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r, Aspect.SERVICE, 1)
        ));

        Map<Aspect, Double> aspects = aggregator.aggregate(SESSION_ID).heatmap().get(0).aspects();

        assertThat(aspects.get(Aspect.SERVICE)).isEqualTo(1.0);
        assertThat(aspects.get(Aspect.PRICE)).isNull();
        assertThat(aspects.get(Aspect.PRODUCT_QUALITY)).isNull();
        assertThat(aspects.get(Aspect.LOCATION)).isNull();
    }

    @Test
    void heatmap_treatsZeroPolarityAsNoData() {
        Competitor c = makeCompetitor(COMP_ID, "Kiosk");
        Review r = makeReview(UUID.randomUUID(), LocalDateTime.now(), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r, Aspect.PRICE, 0)
        ));

        Map<Aspect, Double> aspects = aggregator.aggregate(SESSION_ID).heatmap().get(0).aspects();
        assertThat(aspects.get(Aspect.PRICE)).isNull();
    }

    // ── positioning matrix ───────────────────────────────────────────────────

    @Test
    void positioningMatrix_usesPriceAndProductQualityAxes() {
        Competitor c = makeCompetitor(COMP_ID, "Restaurant");
        Review r = makeReview(UUID.randomUUID(), LocalDateTime.now(), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r, Aspect.PRICE, 1),
            makeSentiment(r, Aspect.PRODUCT_QUALITY, -1)
        ));

        AggregatedStatistics.PositioningPoint point =
            aggregator.aggregate(SESSION_ID).positioningMatrix().get(0);

        assertThat(point.priceSentiment()).isEqualTo(1.0);
        assertThat(point.qualitySentiment()).isEqualTo(-1.0);
    }

    @Test
    void positioningMatrix_zeroWhenNoAspectData() {
        Competitor c = makeCompetitor(COMP_ID, "Snack Bar");
        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of());
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of());

        AggregatedStatistics.PositioningPoint point =
            aggregator.aggregate(SESSION_ID).positioningMatrix().get(0);

        assertThat(point.priceSentiment()).isEqualTo(0.0);
        assertThat(point.qualitySentiment()).isEqualTo(0.0);
    }

    // ── sentiment trends ─────────────────────────────────────────────────────

    @Test
    void sentimentTrends_groupsSentimentsByMonth() {
        Competitor c = makeCompetitor(COMP_ID, "Coffee");
        Review r1 = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 1, 10, 0, 0), c);
        Review r2 = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 2, 15, 0, 0), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r1, r2));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r1, Aspect.SERVICE, 1),
            makeSentiment(r2, Aspect.SERVICE, -1)
        ));

        List<AggregatedStatistics.MonthlyPoint> points =
            aggregator.aggregate(SESSION_ID).sentimentTrends().get(0).points();

        assertThat(points).hasSize(2);
        assertThat(points.get(0).month()).isEqualTo("2024-01");
        assertThat(points.get(0).avgPolarity()).isEqualTo(1.0);
        assertThat(points.get(1).month()).isEqualTo("2024-02");
        assertThat(points.get(1).avgPolarity()).isEqualTo(-1.0);
    }

    @Test
    void sentimentTrends_excludesNeutralPolarity() {
        Competitor c = makeCompetitor(COMP_ID, "Salon");
        Review r = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 3, 1, 0, 0), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r, Aspect.SERVICE, 0)
        ));

        List<AggregatedStatistics.MonthlyPoint> points =
            aggregator.aggregate(SESSION_ID).sentimentTrends().get(0).points();

        assertThat(points).isEmpty();
    }

    @Test
    void sentimentTrends_countsDistinctReviewsInMonth() {
        Competitor c = makeCompetitor(COMP_ID, "Lounge");
        Review r = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 5, 1, 0, 0), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(r));
        // Two aspects from the same review: counts as 1 distinct review
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(r, Aspect.SERVICE, 1),
            makeSentiment(r, Aspect.PRICE, 1)
        ));

        List<AggregatedStatistics.MonthlyPoint> points =
            aggregator.aggregate(SESSION_ID).sentimentTrends().get(0).points();

        assertThat(points).hasSize(1);
        assertThat(points.get(0).reviewCount()).isEqualTo(1);
    }

    @Test
    void sentimentTrends_excludesSentimentsWhoseReviewIsNotInAllReviews() {
        Competitor c = makeCompetitor(COMP_ID, "Diner");
        Review knownReview = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 4, 1, 0, 0), c);
        Review orphanReview = makeReview(UUID.randomUUID(), LocalDateTime.of(2024, 4, 5, 0, 0), c);

        when(competitorRepository.findBySessionId(SESSION_ID)).thenReturn(List.of(c));
        // Only knownReview is in the session's review list
        when(reviewRepository.findByCompetitorSessionId(SESSION_ID)).thenReturn(List.of(knownReview));
        when(aspectSentimentRepository.findByReviewCompetitorId(COMP_ID)).thenReturn(List.of(
            makeSentiment(knownReview, Aspect.SERVICE, 1),
            makeSentiment(orphanReview, Aspect.PRICE, -1)  // orphan: not in allReviews
        ));

        List<AggregatedStatistics.MonthlyPoint> points =
            aggregator.aggregate(SESSION_ID).sentimentTrends().get(0).points();

        assertThat(points).hasSize(1);
        assertThat(points.get(0).reviewCount()).isEqualTo(1);
    }
}
