package com.insurflow.assurance.security;

import com.insurflow.assurance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Loads a user from MongoDB by email for Spring Security.
 * Used internally by JwtAuthFilter after token is validated.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .map(user -> {
                    String roleUpper = user.getRoleName();
                    String roleRaw = user.getRole() != null ? user.getRole().name() : roleUpper;
                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + roleUpper));
                    if (!roleUpper.equalsIgnoreCase(roleRaw)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + roleRaw));
                    }
                    return new org.springframework.security.core.userdetails.User(
                            user.getEmail(),
                            user.getPassword(),
                            authorities
                    );
                })
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
