package com.dermasense.auth.service;

import com.dermasense.auth.dto.SkinProfileRequest;
import com.dermasense.auth.dto.SkinProfileResponse;
import com.dermasense.auth.entity.SkinProfile;
import com.dermasense.auth.entity.User;
import com.dermasense.auth.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class SkinProfileService {

    private final UserRepository userRepository;

    public SkinProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public SkinProfileResponse getProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        ensureProfileExists(user);
        return toResponse(user);
    }

    public SkinProfileResponse getProfileByUserId(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        ensureProfileExists(user);
        return toResponse(user);
    }

    public SkinProfileResponse updateProfileByEmail(String email, SkinProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        SkinProfile profile = user.getSkinProfile();
        if (profile == null) {
            profile = new SkinProfile();
            user.setSkinProfile(profile);
        }

        if (request.getSkinType() != null) profile.setSkinType(request.getSkinType());
        if (request.getSensitivity() != null) profile.setSensitivity(request.getSensitivity());
        if (request.getAllergies() != null) profile.setAllergies(request.getAllergies());
        if (request.getGoals() != null) profile.setGoals(request.getGoals());

        userRepository.save(user);
        return toResponse(user);
    }

    private void ensureProfileExists(User user) {
        if (user.getSkinProfile() == null) {
            user.setSkinProfile(new SkinProfile());
            userRepository.save(user);
        }
    }

    private SkinProfileResponse toResponse(User user) {
        SkinProfile p = user.getSkinProfile();
        return new SkinProfileResponse(
                user.getId(),       // use userId as profile id
                user.getId(),
                p.getSkinType(),
                p.getSensitivity(),
                p.getAllergies(),
                p.getGoals(),
                p.getUpdatedAt()
        );
    }
}
