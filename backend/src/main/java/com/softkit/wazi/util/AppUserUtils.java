package com.softkit.wazi.util;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.model.UserDetailsExtended;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Objects;

public class AppUserUtils {

    public static UserDetailsExtended getUserDetailsExtended(AppUser user) {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(user.getRole()));

        return UserDetailsExtended.builder()
                .username(user.getUsername())
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .password(user.getPassword())
                .authorities(authorities)
                .tokenId(user.getTokenId())
                .userTimezone(user.getUserTimezone())
                .createdAt(user.getCreatedAt())
                .phoneNumber(user.getPhoneNumber())
                .activated(Objects.nonNull(user.getActivated()) && user.getActivated())
                .build();
    }
}
