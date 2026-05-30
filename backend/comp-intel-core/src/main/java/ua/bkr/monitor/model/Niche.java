package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.Set;
import java.util.UUID;

@Entity
@Getter
@Setter
public class Niche {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String displayName;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "niche_google_types", joinColumns = @JoinColumn(name = "niche_id"))
    @Column(name = "google_type")
    private Set<String> googleTypes;
}