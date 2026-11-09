package com.softkit.wazi.util;

import com.softkit.wazi.model.ApiErrorResponse;
import com.softkit.wazi.model.CustomResponse;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.TransientPropertyValueException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@ControllerAdvice
public class AppExceptionHandler {

    @ExceptionHandler(TransientPropertyValueException.class)
    public ResponseEntity<ApiErrorResponse> handleTransientPropertyValueException(Exception ex) {
        log.error("TransientPropertyValueException encountered while handling the request {}", ex.getMessage());

        ApiErrorResponse response = ApiErrorResponse.builder()
                .error("BAD_REQUEST")
                .message("You are attempting to create an entry but the parent entries do not exist")
                .status(400)
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ApiErrorResponse> handleNullPointerException(Exception ex) {
        log.error("NullPointerException encountered while handling the request {}", ex.getMessage());

        ApiErrorResponse response = ApiErrorResponse.builder()
                .error("INTERNAL_SERVER_ERROR")
                .message("NullPointerException experienced while processing the request")
                .status(500)
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.internalServerError().body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<CustomResponse> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex) {
        log.error("MethodArgumentNotValidException encountered while handling the request - {}", ex.getMessage());

        String errorMessage = ex.getBindingResult().getFieldErrors().get(0).getDefaultMessage();

        CustomResponse response = CustomResponse.builder()
                .successful(false)
                .errorMessage(errorMessage)
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleException(Exception ex) {
        log.error("Exception encountered while handling the request - {}", ex.getMessage());

        ApiErrorResponse response = ApiErrorResponse.builder()
                .error("INTERNAL_SERVER_ERROR")
                .message("Exception experienced while processing the request")
                .status(500)
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.internalServerError().body(response);
    }
}
