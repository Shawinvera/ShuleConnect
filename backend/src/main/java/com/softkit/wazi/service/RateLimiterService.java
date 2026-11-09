package com.softkit.wazi.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {
    private final Map<String, Bucket> ipBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> usernameBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> passwordResetBucket = new ConcurrentHashMap<>();

    private Bucket createBucket(){
        Bandwidth limit = Bandwidth
                .builder()
                .capacity(5)
                .refillIntervally(5, Duration.ofMinutes(1))
                .build();

        return Bucket
                .builder()
                .addLimit(limit)
                .build();
    }

    private Bucket createPasswordBucket(){
        Bandwidth limit = Bandwidth
                .builder()
                .capacity(1)
                .refillIntervally(1, Duration.ofMinutes(1))
                .build();

        return Bucket
                .builder()
                .addLimit(limit)
                .build();
    }

    public boolean tryConsumeIp(String ip) {
        return ipBuckets
                .computeIfAbsent(ip, k -> createBucket())
                .tryConsume(1);
    }

    public boolean tryConsumeUsername(String username) {
        return usernameBuckets
                .computeIfAbsent(username, k -> createBucket())
                .tryConsume(1);
    }

    public boolean tryConsumePasswordResetUsername(String username){
        return passwordResetBucket
                .computeIfAbsent(username, k -> createPasswordBucket())
                .tryConsume(1);
    }
}
