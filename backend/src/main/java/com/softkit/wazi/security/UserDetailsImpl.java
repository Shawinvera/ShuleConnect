package com.softkit.wazi.security;

import com.softkit.wazi.entities.AppUser;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;

@Data
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails {
    private String id;
    private String username;
    private String email;
    private String password;
    private Collection<? extends GrantedAuthority> authorities;
//    private boolean enabled;
//    private boolean accountNonExpired;
//    private boolean credentialsNonExpired;
//    private boolean accountNonLocked;

    public static UserDetailsImpl build(AppUser user) {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(user.getRole()));


        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getUsername(),
                user.getPassword(),
                authorities

        );
    }
}
