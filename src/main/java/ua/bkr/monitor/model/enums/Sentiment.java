package ua.bkr.monitor.model.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum Sentiment {
    NEGATIVE(-1),
    NONE(0),
    POSITIVE(1);

    private final int value;

    public static Sentiment fromValue(int value) {
        for (Sentiment s : values()) {
            if (s.value == value) return s;
        }
        throw new IllegalArgumentException("Unknown sentiment value: " + value);
    }
}