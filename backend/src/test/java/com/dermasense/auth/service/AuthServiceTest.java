package com.dermasense.auth.service;

import com.dermasense.auth.dto.AuthResponse;
import com.dermasense.auth.dto.LoginRequest;
import com.dermasense.auth.dto.RegisterRequest;
import com.dermasense.auth.entity.SkinProfile;
import com.dermasense.auth.entity.User;
import com.dermasense.auth.exception.EmailAlreadyExistsException;
import com.dermasense.auth.repository.SkinProfileRepository;
import com.dermasense.auth.repository.UserRepository;
import com.dermasense.auth.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SkinProfileRepository skinProfileRepository;

    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider jwtTokenProvider;
    private AuthService authService;

    private User sampleUser;
    private final UUID sampleId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtTokenProvider = new JwtTokenProvider("DermaSenseAiSuperSecretKeyThatIsAtLeast256BitsLongForSecureJwtAuth2026!", 86400000);
        authService = new AuthService(userRepository, skinProfileRepository, passwordEncoder, jwtTokenProvider);

        sampleUser = new User("Shreya Sharma", "shreya@dermasense.ai", passwordEncoder.encode("password123"));
        sampleUser.setId(sampleId);
        sampleUser.setCreatedAt(Instant.now());
    }

    @Test
    @DisplayName("register: successfully registers new user and returns JWT + user info")
    void register_Success() {
        RegisterRequest request = new RegisterRequest("Shreya Sharma", "shreya@dermasense.ai", "password123");

        when(userRepository.existsByEmail("shreya@dermasense.ai")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(sampleId);
            return u;
        });
        when(skinProfileRepository.save(any(SkinProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertNotNull(response.getToken());
        assertTrue(jwtTokenProvider.validateToken(response.getToken()));
        assertEquals("shreya@dermasense.ai", jwtTokenProvider.getEmailFromToken(response.getToken()));
        assertNotNull(response.getUser());
        assertEquals("shreya@dermasense.ai", response.getUser().getEmail());
        assertEquals("Shreya Sharma", response.getUser().getName());
        assertEquals(sampleId, response.getUser().getId());

        verify(userRepository).existsByEmail("shreya@dermasense.ai");
        verify(userRepository).save(any(User.class));
        verify(skinProfileRepository).save(any(SkinProfile.class));
    }

    @Test
    @DisplayName("register: duplicate email throws EmailAlreadyExistsException (409)")
    void register_DuplicateEmail_ThrowsException() {
        RegisterRequest request = new RegisterRequest("Shreya Sharma", "shreya@dermasense.ai", "password123");

        when(userRepository.existsByEmail("shreya@dermasense.ai")).thenReturn(true);

        EmailAlreadyExistsException ex = assertThrows(EmailAlreadyExistsException.class, () ->
                authService.register(request)
        );

        assertTrue(ex.getMessage().contains("already exists"));
        verify(userRepository, never()).save(any(User.class));
        verify(skinProfileRepository, never()).save(any(SkinProfile.class));
    }

    @Test
    @DisplayName("login: valid credentials returns JWT token")
    void login_Success() {
        LoginRequest request = new LoginRequest("shreya@dermasense.ai", "password123");

        when(userRepository.findByEmail("shreya@dermasense.ai")).thenReturn(Optional.of(sampleUser));

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertNotNull(response.getToken());
        assertTrue(jwtTokenProvider.validateToken(response.getToken()));
        assertEquals("shreya@dermasense.ai", jwtTokenProvider.getEmailFromToken(response.getToken()));
        assertNotNull(response.getUser());
        assertEquals("shreya@dermasense.ai", response.getUser().getEmail());
    }

    @Test
    @DisplayName("login: non-existent email throws BadCredentialsException (401)")
    void login_UserNotFound_ThrowsBadCredentials() {
        LoginRequest request = new LoginRequest("unknown@dermasense.ai", "password123");

        when(userRepository.findByEmail("unknown@dermasense.ai")).thenReturn(Optional.empty());

        BadCredentialsException ex = assertThrows(BadCredentialsException.class, () ->
                authService.login(request)
        );

        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    @DisplayName("login: incorrect password throws BadCredentialsException (401)")
    void login_IncorrectPassword_ThrowsBadCredentials() {
        LoginRequest request = new LoginRequest("shreya@dermasense.ai", "wrongpassword");

        when(userRepository.findByEmail("shreya@dermasense.ai")).thenReturn(Optional.of(sampleUser));

        BadCredentialsException ex = assertThrows(BadCredentialsException.class, () ->
                authService.login(request)
        );

        assertEquals("Invalid email or password", ex.getMessage());
    }
}
