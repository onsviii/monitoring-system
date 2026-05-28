package ua.bkr.monitor.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CharacteristicSourceId implements Serializable {
    private UUID characteristic;
    private UUID review;
}
