package com.dermasense.auth.service;

import com.dermasense.auth.dto.UserResponse;
import com.dermasense.auth.entity.User;
import com.dermasense.auth.exception.ResourceNotFoundException;
import com.dermasense.auth.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUserByEmail(String email) {
        User user = getUserByEmail(email);
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUserById(UUID id) {
        User user = getUserById(id);
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }
}
