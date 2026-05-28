package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.util.UUID;

@Entity
@IdClass(RecommendationSourceId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationSource {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Recommendation recommendation;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Review review;
}

