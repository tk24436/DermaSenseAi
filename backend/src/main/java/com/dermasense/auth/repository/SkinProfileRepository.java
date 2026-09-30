package com.dermasense.auth.repository;

import com.dermasense.auth.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * SkinProfile is embedded inside User, so we query/update
 * it via the UserRepository. This repository exists for
 * any future standalone skin-profile queries.
 */
@Repository
public interface SkinProfileRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);
}
