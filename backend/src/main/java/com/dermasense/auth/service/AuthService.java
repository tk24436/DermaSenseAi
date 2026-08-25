package com.dermasense.auth.service;

import com.dermasense.auth.dto.AuthResponse;
import com.dermasense.auth.dto.LoginRequest;
import com.dermasense.auth.dto.RegisterRequest;
import com.dermasense.auth.dto.UserSummaryDto;
import com.dermasense.auth.entity.SkinProfile;
import com.dermasense.auth.entity.User;
import com.dermasense.auth.exception.EmailAlreadyExistsException;
import com.dermasense.auth.repository.SkinProfileRepository;
import com.dermasense.auth.repository.UserRepository;
import com.dermasense.auth.security.JwtTokenProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final SkinProfileRepository skinProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository,
                       SkinProfileRepository skinProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.skinProfileRepository = skinProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("An account with email " + normalizedEmail + " already exists");
        }

        User user = new User(
                request.getName().trim(),
                normalizedEmail,
                passwordEncoder.encode(request.getPassword())
        );

        User savedUser = userRepository.save(user);

        // Initialize empty skin profile for new user
        SkinProfile skinProfile = new SkinProfile(savedUser);
        skinProfileRepository.save(skinProfile);
        savedUser.setSkinProfile(skinProfile);

        String token = jwtTokenProvider.generateToken(savedUser);
        UserSummaryDto userSummary = new UserSummaryDto(
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail()
        );

        return new AuthResponse(token, userSummary);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtTokenProvider.generateToken(user);
        UserSummaryDto userSummary = new UserSummaryDto(
                user.getId(),
                user.getName(),
                user.getEmail()
        );

        return new AuthResponse(token, userSummary);
    }
}
