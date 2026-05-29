package ua.bkr.monitor.model.record;

import java.util.List;

public record ExtractedCharacteristic(String text, List<Integer> sourceIndices) {
}
