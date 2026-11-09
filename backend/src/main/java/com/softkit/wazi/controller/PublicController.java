package com.softkit.wazi.controller;

import com.softkit.wazi.entities.SubscriptionTier;
import com.softkit.wazi.event.CommunicationEvent;
import com.softkit.wazi.model.*;
import com.softkit.wazi.model.safaricom.StkCallbackWrapper;
import com.softkit.wazi.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Slf4j
public class PublicController {
    private final CourseService courseService;
    private final GradeService gradeService;
    private final GradeSubjectService gradeSubjectService;
    private final LessonService lessonService;
    private final PaymentService paymentService;
    private final SubscriptionTierService subscriptionTierService;
    private final AppUserService  appUserService;
    private final ApplicationEventPublisher eventPublisher;
    private final ContactUsService contactUsService;

    @GetMapping("/courses/byCountryCode")
    public ResponseEntity<?> fetchUserCourseByCountryCode(
            HttpServletRequest request,
            @RequestParam String countryCode) {
        return courseService.fetchCourseByCountryCode(request, countryCode, 1);
    }

    @GetMapping("/grades/fetchByCourse/{courseId}")
    public ResponseEntity<List<GradeDto>> getCourseGrades(@PathVariable String courseId) {
        return gradeService.getCourseGrades(courseId);

    }

    @GetMapping("/subjects/byGrade/{gradeId}")
    public ResponseEntity<List<GradeSubjectDetailsDto>> getGradeSubjectByGrade(@PathVariable String gradeId) {
        List<GradeSubjectDetailsDto> data = gradeSubjectService.getGradeSubjectByGradeId(gradeId);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/lessons/bySubject/{subjectId}")
    public ResponseEntity<?> getLessonsBySubject(@PathVariable String subjectId) {
        List<SubjectLessonDto> lessons= lessonService.fetchLessonsBySubjectId(subjectId, null);
        //since this is a public endpoint we will only return the active lessons and make sure the content and video links are not included in the response
        lessons.forEach(l->{
            if (!l.getTrailer()){
                l.setContent("");
                l.setVideoUrl("");
            }
        });
        return  ResponseEntity.ok(lessons);
    }

    @PostMapping("/safaricom/callback")
    public HttpEntity<Object> triggerPayment(
            @RequestBody StkCallbackWrapper wrapper
    ) {
        log.info("CallBack from Safaricom received");
        return paymentService.paymentSafaricomCallback(wrapper);
    }

    @GetMapping("/subscription/tiers/{courseId}")
    public ResponseEntity<?> getLessonsBySubject(
            @PathVariable String courseId,
            @RequestParam(required = false) Integer status
            ) {
        if (status==null) status=1;
        List<SubscriptionTier> data = subscriptionTierService.fetchSubscriptionTierByStatus(courseId, status);
        return ResponseEntity.ok(data);
    }

    @PutMapping("/password/reset")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody PasswordResetDto passwordResetDto
    ){
        CustomResponse resp= appUserService.resetPasswordPublic(passwordResetDto);
        if (resp.getSuccessful()) {
            return ResponseEntity.ok(resp);
        } else {
            return ResponseEntity.badRequest().body(resp);
        }
    }

    @PostMapping("/password/reset/request")
    public ResponseEntity<?> requestPasswordReset(
            @RequestBody PasswordResetDto passwordResetDto
    ){
        CustomResponse resp= appUserService.requestPasswordReset(passwordResetDto);
        if (resp.getSuccessful()) {
            return ResponseEntity.ok(resp);
        } else {
            return ResponseEntity.badRequest().body(resp);
        }
    }

    @GetMapping("/publish/event")
    public ResponseEntity<?> testEvent(
            @RequestParam String event){
        log.info("Event received: {}", event);
        eventPublisher.publishEvent(new CommunicationEvent(this, event));
        return ResponseEntity.ok("Event Published");
    }

    @GetMapping("/lessons/byGradeSubject")
    public ResponseEntity<?> getLessonsByGradeSubject(
            @RequestParam String gradeSubjectId,
            @RequestParam String learnerId
            ) {
        List<SubjectLessonDto> lessons= lessonService.lessonFetch(gradeSubjectId, learnerId);
        //since this is a public endpoint we will only return the active lessons and make sure the content and video links are not included in the response
        lessons.forEach(l->{
            if (!l.getTrailer()){
                l.setContent("");
                l.setVideoUrl("");
            }
        });
        return  ResponseEntity.ok(lessons);
    }

    @PostMapping("/contactUs")
    public ResponseEntity<?> contactUs(
            @RequestBody @Valid ContactUsDto contactUsDto
    ){
        contactUsService.sendContactUsEmail( contactUsDto);
        return ResponseEntity.ok("Email Sent");

    }


}
