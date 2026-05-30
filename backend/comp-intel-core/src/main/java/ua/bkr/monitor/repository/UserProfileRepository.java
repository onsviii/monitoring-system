package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ua.bkr.monitor.model.UserProfile;

public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
    @Query("SELECT u.googlePlaceId FROM UserProfile u WHERE u.id = :userId")
    String findPlaceIdByUserId(@Param("userId") String userId);
}
