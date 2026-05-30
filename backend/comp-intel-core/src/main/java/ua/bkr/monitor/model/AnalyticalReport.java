package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ua.bkr.monitor.dto.AggregatedStatistics;

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
    private AggregatedStatistics aggregatedStatistics;

    @Column(nullable = false)
    private LocalDateTime generatedAt;

    private Boolean aiMarked;

    @Column(columnDefinition = "TEXT")
    private String disclaimer = """
            Увага: Цей аналітичний звіт згенеровано автоматично з використанням алгоритмів штучного інтелекту (ШІ) \
            на основі відкритих даних та публічних відгуків користувачів (Google Places).
            
            Звіт має виключно інформаційно-дорадчий характер. Незважаючи на використання сучасних NLP-моделей \
            для аналізу тональності, система не може гарантувати стовідсоткову точність інтерпретації сарказму, \
            контексту або достовірності самих відгуків. Будь-які управлінські чи фінансові рішення, прийняті \
            на основі наданих рекомендацій, є виключною зоною відповідальності користувача (власника бізнесу).
            """;;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL)
    private List<Recommendation> recommendations;
}