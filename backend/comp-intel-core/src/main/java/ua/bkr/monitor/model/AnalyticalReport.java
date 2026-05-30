package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticalReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private AnalysisSession session;

    @JdbcTypeCode(SqlTypes.JSON)
    private String aggregatedStatistics;

    @Column(nullable = false)
    private LocalDateTime generatedAt;

    private Boolean aiMarked;

    @Column(columnDefinition = "TEXT")
    private String disclaimer;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL)
    private List<Recommendation> recommendations;
}