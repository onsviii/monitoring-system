package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.util.UUID;

@Entity
@IdClass(CharacteristicSourceId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CharacteristicSource {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private FreeCharacteristic characteristic;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Review review;
}

