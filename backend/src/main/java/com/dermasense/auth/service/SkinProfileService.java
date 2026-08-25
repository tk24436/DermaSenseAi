package com.dermasense.auth.service;

import com.dermasense.auth.dto.SkinProfileRequest;
import com.dermasense.auth.dto.SkinProfileResponse;
import com.dermasense.auth.entity.SkinProfile;
import com.dermasense.auth.entity.User;
import com.dermasense.auth.repository.SkinProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SkinProfileService {

    private final SkinProfileRepository skinProfileRepository;
    private final UserService userService;

    public SkinProfileService(SkinProfileRepository skinProfileRepository, UserService userService) {
        this.skinProfileRepository = skinProfileRepository;
        this.userService = userService;
    }

    @Transactional
    public SkinProfileResponse getProfileByEmail(String email) {
        User user = userService.getUserByEmail(email);
        SkinProfile profile = skinProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    SkinProfile newProfile = new SkinProfile(user);
                    return skinProfileRepository.save(newProfile);
                });
        return toResponse(profile);
    }

    @Transactional
    public SkinProfileResponse getProfileByUserId(UUID userId) {
        User user = userService.getUserById(userId);
        SkinProfile profile = skinProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    SkinProfile newProfile = new SkinProfile(user);
                    return skinProfileRepository.save(newProfile);
                });
        return toResponse(profile);
    }

    @Transactional
    public SkinProfileResponse updateProfileByEmail(String email, SkinProfileRequest request) {
        User user = userService.getUserByEmail(email);
        SkinProfile profile = skinProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> new SkinProfile(user));

        if (request.getSkinType() != null) {
            profile.setSkinType(request.getSkinType());
        }
        if (request.getSensitivity() != null) {
            profile.setSensitivity(request.getSensitivity());
        }
        if (request.getAllergies() != null) {
            profile.setAllergies(request.getAllergies());
        }
        if (request.getGoals() != null) {
            profile.setGoals(request.getGoals());
        }

        SkinProfile updatedProfile = skinProfileRepository.save(profile);
        return toResponse(updatedProfile);
    }

    private SkinProfileResponse toResponse(SkinProfile profile) {
        return new SkinProfileResponse(
                profile.getId(),
                profile.getUser().getId(),
                profile.getSkinType(),
                profile.getSensitivity(),
                profile.getAllergies(),
                profile.getGoals(),
                profile.getUpdatedAt()
        );
    }
}
