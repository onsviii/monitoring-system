package ua.bkr.monitor.provider.dto;

import ua.bkr.monitor.model.enums.Aspect;

import java.util.Map;

public record AspectClassification(Map<Aspect, AspectResult> aspects) {
}
