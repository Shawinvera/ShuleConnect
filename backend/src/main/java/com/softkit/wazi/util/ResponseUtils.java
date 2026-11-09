package com.softkit.wazi.util;

import com.softkit.wazi.model.ApiCreatedResponse;
import com.softkit.wazi.model.ApiErrorResponse;
import com.softkit.wazi.model.CustomResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;

import java.time.Instant;

public class ResponseUtils {
    public static ResponseEntity<?> createErrorResponse(HttpServletRequest request, String error, String message, int status) {
        ApiErrorResponse resp = ApiErrorResponse.builder()
                .error(error)
                .message(message)
                .timestamp(Instant.now())
                .status(status)
                .build();
        return ResponseEntity.status(status).body(resp);
    }
    public static ResponseEntity<?> duplicateErrorResponse() {
        ApiErrorResponse resp = ApiErrorResponse.builder()
                .error("CONFLICT")
                .message("A duplicate entry already exists")
                .timestamp(Instant.now())
                .status(409)
                .build();
        return ResponseEntity.status(409).body(resp);
    }

    public static ResponseEntity<?> badRequestErrorResponse(String message) {
        ApiErrorResponse resp = ApiErrorResponse.builder()
                .error("BAD_REQUEST")
                .message(message)
                .timestamp(Instant.now())
                .status(400)
                .build();
        return ResponseEntity.status(400).body(resp);
    }

    public static ResponseEntity<?> entryCreatedResponse(String generatedId, String entityName) {
        ApiCreatedResponse resp = ApiCreatedResponse.builder()
                .message(entityName+" created successfully")
                .timestamp(Instant.now())
                .generatedId(generatedId)
                .build();
        return ResponseEntity.status(201).body(resp);
    }

    public static ResponseEntity<?> createResponse(CustomResponse customResponse) {
        if (customResponse.getSuccessful()) {
            return ResponseEntity.ok(customResponse);
        } else {
            return ResponseEntity.badRequest().body(customResponse);
        }
    }
}
