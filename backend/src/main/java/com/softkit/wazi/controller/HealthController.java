package com.softkit.wazi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lightweight health check endpoint.
 * Used by uptime monitors (cron-job.org / UptimeRobot) to keep the Render free tier awake.
 */
@RestController
@RequestMapping("/public/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "ShuleConnect",
                "timestamp", System.currentTimeMillis()
        ));
    }
}
