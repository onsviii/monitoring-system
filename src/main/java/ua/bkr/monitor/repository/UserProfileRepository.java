package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.UserProfile;

public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
}
