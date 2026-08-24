package com.dermasense.auth.repository;

import com.dermasense.auth.entity.SkinProfile;
import com.dermasense.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SkinProfileRepository extends JpaRepository<SkinProfile, UUID> {

    Optional<SkinProfile> findByUserId(UUID userId);

    Optional<SkinProfile> findByUser(User user);
}
