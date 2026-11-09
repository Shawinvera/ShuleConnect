package com.softkit.wazi.controller;

import com.softkit.wazi.model.AppUserCourseReqDto;
import com.softkit.wazi.model.AppUserDto;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.LearnerDto;
import com.softkit.wazi.service.LearnerService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/learner")
@RequiredArgsConstructor
public class LearnerController {
    private final LearnerService learnerService;
    @PostMapping("/registration")
    public ResponseEntity<?> registerLearner(
            HttpServletRequest request,
            @RequestBody LearnerDto learnerDto
    ) {
        return learnerService.registerLearner(learnerDto);
    }
    @PutMapping("/update/profile")
    public ResponseEntity<?> updateLearner(
            @RequestBody LearnerDto learnerDto
    ) {
        CustomResponse resp = learnerService.updateLearner(learnerDto);
        if (resp.getSuccessful()) {
            return ResponseEntity.ok(resp);
        } else {
            return ResponseEntity.badRequest().body(resp);
        }
    }

    @GetMapping("/fetchByUserId/{userId}")
    public ResponseEntity<?> fetchLearnersByUserId(
            HttpServletRequest request,
            @PathVariable String userId,
            @RequestParam(defaultValue = "1") Integer status){
        List<LearnerDto> learnersList = learnerService.fetchLearnersByUserId(request, userId);
        return ResponseEntity.ok(learnersList);
    }

    @GetMapping("/fetchLessonSummary/{learnerId}")
    public ResponseEntity<?> fetchLessonSummary(
            HttpServletRequest request,
            @PathVariable String learnerId){
        Object c = learnerService.fetchLessonSummary(request, learnerId);
        return ResponseEntity.ok(c);
    }

    @GetMapping("/history/{learnerId}")
    public ResponseEntity<?> fetchLearnerHistory(
            HttpServletRequest request,
            @PathVariable String learnerId){
        Object c = learnerService.fetchLearnerHistory(request, learnerId);
        return ResponseEntity.ok(c);
    }


}
