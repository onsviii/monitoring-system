package ua.bkr.monitor.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ua.bkr.monitor.model.record.Location;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    @Id
    private String id;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private String businessName;

    private String googlePlaceId;
    private String address;

    @Embedded
    private Location location;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<AnalysisSession> sessions;
}