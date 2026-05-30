package ua.bkr.monitor.exception;

import ua.bkr.monitor.model.enums.CollectionErrorType;

public class DataCollectionException extends RuntimeException {
    private final CollectionErrorType errorType;
    private final String placeId;

    public DataCollectionException(CollectionErrorType errorType,
                                   String placeId, String message) {
        super(message);
        this.errorType = errorType;
        this.placeId = placeId;
    }
}