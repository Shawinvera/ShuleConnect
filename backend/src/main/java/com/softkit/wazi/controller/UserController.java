package com.softkit.wazi.controller;

import com.softkit.wazi.model.AppUserCourseReqDto;
import com.softkit.wazi.model.AppUserDto;
import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.PasswordResetDto;
import com.softkit.wazi.service.AppUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {
    private final AppUserService userService;
    @PostMapping("/registration")
    public ResponseEntity<?> registerUser(@RequestBody AppUserDto appUserDto) {
        return userService.registerUser(appUserDto);
    }
    @PutMapping("/profile/update")
    public ResponseEntity<CustomResponse> updateUserProfile(@RequestBody AppUserDto appUserDto) {
        CustomResponse resp = userService.updateUserProfile(appUserDto);
        if (resp.getSuccessful()) {
            return ResponseEntity.ok(resp);
        } else {
            return ResponseEntity.badRequest().body(resp);
        }
    }

    @PostMapping("/course/registration")
    public ResponseEntity<?> registerUserCourse(
            HttpServletRequest request,
            @RequestBody AppUserCourseReqDto userCourseDto) {
        return userService.registerUserCourse(userCourseDto, request);
    }

    @GetMapping("/fetchCourse/byUserId/{userId}")
    public ResponseEntity<?> fetchUserCourseByUserId(
            HttpServletRequest request,
            @PathVariable String userId,
            @RequestParam(defaultValue = "1") Integer status){
        return userService.fetchUserCourseByUserId(request, userId);
    }

    @GetMapping("/me")
    public ResponseEntity<?> fetchMe(HttpServletRequest request){
        return userService.fetchUserFromCookie(request);
    }

    @PostMapping("/phone-number/update")
    public ResponseEntity<?> updatePhoneNumber(
            HttpServletRequest request,
            @RequestBody AppUserDto appUser
            ){
        CustomResponse customResponse = userService.updateUserPhoneNumber(appUser);
        if (customResponse.getSuccessful()) {
            return ResponseEntity.ok(customResponse);
        } else {
            return ResponseEntity.badRequest().body(customResponse);
        }
    }


}
