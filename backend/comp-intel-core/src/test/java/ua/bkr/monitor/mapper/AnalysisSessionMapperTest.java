package ua.bkr.monitor.mapper;

import org.junit.jupiter.api.Test;
import ua.bkr.monitor.model.enums.AnalysisStage;

import static org.assertj.core.api.Assertions.assertThat;

class AnalysisSessionMapperTest {

    @Test
    void calculateProgress_returnsCorrectValueForEachStage() {
        assertThat(AnalysisSessionMapper.calculateProgress(AnalysisStage.COLLECTING_DATA)).isEqualTo(20);
        assertThat(AnalysisSessionMapper.calculateProgress(AnalysisStage.ANONYMIZING)).isEqualTo(40);
        assertThat(AnalysisSessionMapper.calculateProgress(AnalysisStage.CLASSIFYING)).isEqualTo(60);
        assertThat(AnalysisSessionMapper.calculateProgress(AnalysisStage.EXTRACTING_CHARACTERISTICS)).isEqualTo(80);
        assertThat(AnalysisSessionMapper.calculateProgress(AnalysisStage.GENERATING_REPORT)).isEqualTo(90);
    }

    @Test
    void calculateProgress_returnsZeroForNullStage() {
        assertThat(AnalysisSessionMapper.calculateProgress(null)).isEqualTo(0);
    }

    @Test
    void calculateProgress_coversAllStages() {
        // Ensures no stage is accidentally missing from the switch
        for (AnalysisStage stage : AnalysisStage.values()) {
            int progress = AnalysisSessionMapper.calculateProgress(stage);
            assertThat(progress)
                .as("Stage %s should have a positive progress value", stage)
                .isGreaterThan(0)
                .isLessThanOrEqualTo(100);
        }
    }
}
