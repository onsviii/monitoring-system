package ua.bkr.monitor.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum Aspect {
    SERVICE("Сервіс"),
    PRODUCT_QUALITY("Якість"),
    PRICE("Ціна"),
    LOCATION("Локація");

    private final String displayName;
}
