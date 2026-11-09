package com.softkit.wazi.model;

import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;

@Getter
@RequiredArgsConstructor
@Builder
@AllArgsConstructor
//@NoArgsConstructor
public class UserDetailsExtended implements UserDetails {

    private String id;
    private String username;
    private String email;
    private String password;
    private String firstName;
    private String lastName;
    private String tokenId;
    private Instant createdAt;
    private String userTimezone;
    private String phoneNumber;
    private Boolean activated;
    private Collection<? extends GrantedAuthority> authorities;
}
