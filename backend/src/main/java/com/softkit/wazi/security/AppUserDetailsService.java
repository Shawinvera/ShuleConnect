package com.softkit.wazi.security;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.model.UserDetailsExtended;
import com.softkit.wazi.repository.AppUserRepo;
import com.softkit.wazi.util.AppUserUtils;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {
    private final AppUserRepo appUserRepo;
    @Override
    public UserDetailsExtended loadUserByUsername(@NonNull String username) throws UsernameNotFoundException {
        AppUser user = appUserRepo.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        return AppUserUtils.getUserDetailsExtended(user);
    }
}
