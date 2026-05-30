package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import ua.bkr.monitor.model.enums.AnalysisStage;
import ua.bkr.monitor.model.enums.SessionStatus;
import ua.bkr.monitor.model.record.Location;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private UserProfile user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "niche_id", nullable = false)
    private Niche businessNiche;

    @Embedded
    private Location location;

    private Double radiusKm;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    @Enumerated(EnumType.STRING)
    private AnalysisStage stage;

    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    private List<LLMInteractionLog> llmLogs;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    private List<CollectionErrorLog> errorLogs;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    private List<Competitor> competitors;

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL)
    private AnalyticalReport analyticalReports;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    private List<ChatMessage> chatMessages;
}