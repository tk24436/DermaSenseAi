package com.dermasense.auth.controller;

import com.dermasense.auth.dto.SkinProfileRequest;
import com.dermasense.auth.dto.SkinProfileResponse;
import com.dermasense.auth.dto.UserResponse;
import com.dermasense.auth.security.UserPrincipal;
import com.dermasense.auth.service.SkinProfileService;
import com.dermasense.auth.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final SkinProfileService skinProfileService;

    public UserController(UserService userService, SkinProfileService skinProfileService) {
        this.userService = userService;
        this.skinProfileService = skinProfileService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        UserResponse response = userService.getCurrentUserByEmail(currentUser.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/profile")
    public ResponseEntity<SkinProfileResponse> getCurrentUserProfile(@AuthenticationPrincipal UserPrincipal currentUser) {
        SkinProfileResponse response = skinProfileService.getProfileByEmail(currentUser.getUsername());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/profile")
    public ResponseEntity<SkinProfileResponse> updateCurrentUserProfile(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestBody SkinProfileRequest request) {
        SkinProfileResponse response = skinProfileService.updateProfileByEmail(currentUser.getUsername(), request);
        return ResponseEntity.ok(response);
    }
}
