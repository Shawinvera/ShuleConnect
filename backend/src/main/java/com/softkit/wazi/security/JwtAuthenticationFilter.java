package com.softkit.wazi.security;

import com.softkit.wazi.model.ThreadData;
import com.softkit.wazi.model.UserDetailsExtended;
import com.softkit.wazi.service.AppUserService;
import com.softkit.wazi.service.JwtService;
import com.softkit.wazi.util.HttpRequestUtils;
import com.softkit.wazi.util.RequestContext;
import com.softkit.wazi.util.StringUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                filterChain.doFilter(request, response);
                return;
            }
            //list of endpoints that don't require authentication
            List<String> excludedEndpoints = List.of(
                    "/auth/registration",
                    "/auth/login",
                    "/auth/refresh",
                    "/auth/user/otp/activation"
            );
            String requestPath = request.getRequestURI();
            boolean isExcludedPath = excludedEndpoints.stream().anyMatch(requestPath::contains);
            if (!isExcludedPath) {
                isExcludedPath = requestPath.contains("/public") || requestPath.contains("/auth/sso") ;
            }

            //set ThreadLocal authentication context
            ThreadData threadData = ThreadData.builder().build();

            String accessToken = HttpRequestUtils.getAccessTokenFromCookie(request, "accessToken");

            if (isExcludedPath || accessToken == null) {
                filterChain.doFilter(request, response);
                //get timezone from request header and set it in thread data
                String timezone = request.getHeader("Timezone");
                timezone = StringUtils.getTimezone(timezone);
                threadData.setUserTimezone(timezone);
                RequestContext.setThreadData(threadData);
                return;
            }
            String username = jwtService.extractUsername(accessToken);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetailsExtended userDetails = userDetailsService.loadUserByUsername(username);
                if (jwtService.isTokenValid(accessToken, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    threadData.setUserId(userDetails.getId());
                    threadData.setUserTimezone(userDetails.getUserTimezone());
                    RequestContext.setThreadData(threadData);
                }
                filterChain.doFilter(request, response);

            }
        }  finally {
            RequestContext.clear();
        }
    }
}
