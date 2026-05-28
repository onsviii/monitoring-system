package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Competitor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String externalApiId;

    private String name;
    private String address;
    private String category;
    private Double rating;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private AnalysisSession session;

    @OneToMany(mappedBy = "competitor", cascade = CascadeType.ALL)
    private List<Review> reviews;

    @OneToMany(mappedBy = "competitor", cascade = CascadeType.ALL)
    private List<FreeCharacteristic> freeCharacteristics;
}