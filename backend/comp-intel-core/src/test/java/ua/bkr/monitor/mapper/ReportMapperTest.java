package ua.bkr.monitor.mapper;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import ua.bkr.monitor.dto.*;
import ua.bkr.monitor.model.*;
import ua.bkr.monitor.model.enums.Aspect;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class ReportMapperTest {

    private final ReportMapper mapper = Mappers.getMapper(ReportMapper.class);

    @Test
    void toCompetitorDto_mapsDerivedFields() {
        UUID competitorId = UUID.randomUUID();
        Competitor competitor = new Competitor();
        competitor.setId(competitorId);
        competitor.setName("Cafe A");
        competitor.setAddress("Address");
        competitor.setRating(4.6);
        competitor.setExternalApiId("place-1");

        Niche niche = new Niche();
        niche.setDisplayName("Coffee");
        competitor.setNiche(niche);

        Review reviewOne = new Review();
        reviewOne.setId(UUID.randomUUID());
        Review reviewTwo = new Review();
        reviewTwo.setId(UUID.randomUUID());

        Map<UUID, List<Review>> reviewsMap = Map.of(competitorId, List.of(reviewOne, reviewTwo));

        AspectCategory serviceCategory = new AspectCategory();
        serviceCategory.setName(Aspect.SERVICE);
        AspectCategory priceCategory = new AspectCategory();
        priceCategory.setName(Aspect.PRICE);

        AspectSentiment positive = new AspectSentiment();
        positive.setCategory(serviceCategory);
        positive.setPolarity(1);
        positive.setConfidenceScore(0.8f);

        AspectSentiment negative = new AspectSentiment();
        negative.setCategory(serviceCategory);
        negative.setPolarity(-1);
        negative.setConfidenceScore(0.6f);

        AspectSentiment zero = new AspectSentiment();
        zero.setCategory(priceCategory);
        zero.setPolarity(0);
        zero.setConfidenceScore(0.5f);

        AspectSentiment missing = new AspectSentiment();
        missing.setCategory(priceCategory);
        missing.setPolarity(null);
        missing.setConfidenceScore(0.4f);

        Map<UUID, List<AspectSentiment>> aspectsMap = Map.of(
                competitorId,
                List.of(positive, negative, zero, missing)
        );

        FreeCharacteristic characteristic = new FreeCharacteristic();
        characteristic.setId(UUID.randomUUID());
        characteristic.setText("Затишна тераса");
        characteristic.setCompetitor(competitor);

        CharacteristicSource sourceOne = new CharacteristicSource(characteristic, reviewOne);
        CharacteristicSource sourceTwo = new CharacteristicSource(characteristic, reviewTwo);

        Map<UUID, List<FreeCharacteristic>> characteristicsMap = Map.of(
                competitorId,
                List.of(characteristic)
        );
        Map<UUID, List<CharacteristicSource>> charSourcesMap = Map.of(
                characteristic.getId(),
                List.of(sourceOne, sourceTwo)
        );

        CompetitorDto dto = mapper.toCompetitorDto(
                competitor,
                "place-1",
                reviewsMap,
                aspectsMap,
                characteristicsMap,
                charSourcesMap
        );

        assertThat(dto.nicheCode()).isEqualTo("Coffee");
        assertThat(dto.isOwn()).isTrue();
        assertThat(dto.reviewCount()).isEqualTo(2);
        assertThat(dto.aspects()).hasSize(1);
        AspectDto aspectDto = dto.aspects().get(0);
        assertThat(aspectDto.aspect()).isEqualTo(Aspect.SERVICE);
        assertThat(aspectDto.averagePolarity()).isEqualTo(0.0);
        assertThat(aspectDto.averageConfidence()).isCloseTo(0.7, within(0.0001));
        assertThat(aspectDto.count()).isEqualTo(2);
        assertThat(dto.freeCharacteristics()).hasSize(1);
        FreeCharacteristicDto characteristicDto = dto.freeCharacteristics().get(0);
        assertThat(characteristicDto.text()).isEqualTo("Затишна тераса");
        assertThat(characteristicDto.sourceReviewIds())
                .containsExactlyInAnyOrder(reviewOne.getId(), reviewTwo.getId());
    }

    @Test
    void toRecommendationDto_mapsSourceReviewIds() {
        UUID recommendationId = UUID.randomUUID();
        Recommendation recommendation = new Recommendation();
        recommendation.setId(recommendationId);
        recommendation.setText("Improve service");

        Review review = new Review();
        review.setId(UUID.randomUUID());

        RecommendationSource source = new RecommendationSource(recommendation, review);
        Map<UUID, List<RecommendationSource>> sources = Map.of(
                recommendationId,
                List.of(source)
        );

        RecommendationDto dto = mapper.toRecommendationDto(recommendation, sources);

        assertThat(dto.id()).isEqualTo(recommendationId);
        assertThat(dto.text()).isEqualTo("Improve service");
        assertThat(dto.sourceReviewIds()).containsExactly(review.getId());
    }

    @Test
    void toReportResponse_mapsSessionAndReportFields() {
        UUID sessionId = UUID.randomUUID();
        AnalysisSession session = new AnalysisSession();
        session.setId(sessionId);

        AggregatedStatistics stats = new AggregatedStatistics(
                null,
                List.of(),
                List.of(),
                List.of(),
                List.of()
        );

        AnalyticalReport report = new AnalyticalReport();
        report.setName("Q1 Report");
        report.setGeneratedAt(LocalDateTime.of(2024, 5, 1, 10, 30));
        report.setAiMarked(true);
        report.setDisclaimer("Disclaimer");
        report.setAggregatedStatistics(stats);

        CompetitorDto competitorDto = new CompetitorDto(
                UUID.randomUUID(),
                "Cafe A",
                "Addr",
                "Coffee",
                4.5,
                3,
                true,
                List.of(),
                List.of()
        );
        RecommendationDto recommendationDto = new RecommendationDto(
                UUID.randomUUID(),
                "Improve service",
                List.of()
        );

        ReportResponse response = mapper.toReportResponse(
                report,
                session,
                List.of(competitorDto),
                List.of(recommendationDto)
        );

        assertThat(response.sessionId()).isEqualTo(sessionId);
        assertThat(response.reportName()).isEqualTo("Q1 Report");
        assertThat(response.generatedAt()).isEqualTo(report.getGeneratedAt());
        assertThat(response.aiMarked()).isTrue();
        assertThat(response.disclaimer()).isEqualTo("Disclaimer");
        assertThat(response.aggregatedStatistics()).isSameAs(stats);
        assertThat(response.competitors()).containsExactly(competitorDto);
        assertThat(response.recommendations()).containsExactly(recommendationDto);
    }
}
