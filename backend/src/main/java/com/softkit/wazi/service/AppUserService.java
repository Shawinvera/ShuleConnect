package com.softkit.wazi.service;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.entities.AppUserCourse;
import com.softkit.wazi.entities.Course;
import com.softkit.wazi.event.CommunicationEvent;
import com.softkit.wazi.mapper.AppUserMapper;
import com.softkit.wazi.mapper.CourseMapper;
import com.softkit.wazi.model.*;
import com.softkit.wazi.repository.AppUserCourseRepo;
import com.softkit.wazi.repository.AppUserRepo;
import com.softkit.wazi.util.*;
import jakarta.mail.MessagingException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Slf4j
@Service
@RequiredArgsConstructor
public class AppUserService {
    private final AppUserRepo appUserRepo;
    private final AppUserMapper userMapper;
    private final AppUserCourseRepo appUserCourseRepo;
    private final CourseMapper courseMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LearnerService learnerService;
    private final ATService atService;
    private final BrevoEmailService brevoService;
    private final String activationEmailFile = "templates/activationEmail.html";
    private final String otpEmailTemplate = "templates/otpEmail.html";
    @Value("${wazi.backend-base-url}")
    private String appBaseUrl;
    @Value("${wazi.frontend-dashboard-url}")
    private String waziFrontEnd;
    private final SecureTokenGenerator secureTokenGenerator;
    private final EntityManager entityManager;
    private final RateLimiterService rateLimiterService;

    public ResponseEntity<?> registerUser(AppUserDto appUserDto) {
        try {
            String userTimezone = appUserDto.getUserTimezone();
            if (userTimezone == null || userTimezone.isBlank()) {
                return ResponseUtils.badRequestErrorResponse("Timezone is required");
            }
            String username = appUserDto.getUsername().trim().toUpperCase();
            //check if username is an email address
            boolean isEmail = StringUtils.isValidEmail(username);

            //generate an OTP only if prod
            boolean isDev = StringUtils.isDevMode();
            //find user by usernameIgnoreCase
            Optional<AppUser> _user = appUserRepo.findByUsernameIgnoreCase(username);
            if (_user.isPresent()) {
                AppUser appUser = _user.get();
                //if user is activated, return error
                if (appUser.getActivated()) {
                    String loginProvider = appUser.getLoginProvider();
                    if (loginProvider == null || loginProvider.isBlank()) {
                        loginProvider ="LOCAL";
                    }
                    if (loginProvider.equalsIgnoreCase("LOCAL")){
                        return ResponseUtils.badRequestErrorResponse("User is already having an account. Proceed to login with GMAIL, APPLE or MICROSOFT");
                    }
                    return ResponseUtils.badRequestErrorResponse("User is already having an account. Proceed to login");
                }else {
                    if (isEmail) {
                        sendActivationEmail(appUser);
                    }else{
                        sendActivationOtp(appUser);
                    }
                    return ResponseUtils.entryCreatedResponse(appUser.getId(), "User");
                }
            }

            appUserDto.setUsername(username);
            appUserDto.setRole(appUserDto.getRole().toUpperCase());

            AppUser appUser = userMapper.toEntity(appUserDto);
            String activationToken = UUID.randomUUID().toString();
            String otp = StringUtils.generateOtp(4, username);
            if (!isEmail) {
                activationToken = secureTokenGenerator.hashToken(otp);
                String phoneNumber = StringUtils.formatPhoneNumber(username);
                //validate phone number
                if (!StringUtils.isValidPhoneNumber(phoneNumber)) {
                    return ResponseUtils.badRequestErrorResponse("Invalid phone number format");
                }
                appUser.setPhoneNumber(phoneNumber);
            }
            appUser.setActivationToken(activationToken);
            appUser.setPassword(passwordEncoder.encode(appUserDto.getPassword()));
            appUser.setActivated(false);
            appUser.setOtp(otp);

            appUserRepo.save(appUser);
            if (isEmail) {
                sendActivationEmail(appUser);
            }else{
                //only send otp if in prod. This is to minimize cost
                if(!isDev) {
                    sendActivationOtp(appUser);
                }
            }

            return ResponseUtils.entryCreatedResponse(appUser.getId(), "User");
        } catch (Exception e) {
            String errMessage = e.getMessage() != null ? e.getMessage() : "An error occurred while saving the user";
            if (errMessage.contains("unique_username")) {
                return ResponseUtils.badRequestErrorResponse("Username is already taken");
            }
            return ResponseUtils.badRequestErrorResponse(errMessage);
        }
    }

    private void sendActivationOtp(AppUser appUser) {
        String message = "Your Wazi account activation OTP is: "+appUser.getOtp();
        try {
            atService.sendSms(appUser.getPhoneNumber(), message);
        } catch (MessagingException e) {
            log.error("Error sending Activation OTP with error {}", e.getMessage());
        }
    }

    private void sendPasswordReset(String phoneNumber, String otp) {
        String message = "Your Wazi Password reset OTP is: "+otp;
        try {
            atService.sendSms(phoneNumber, message);
        } catch (MessagingException e) {
            log.error("Error sending PasswordReset OTP with error {}", e.getMessage());
        }
    }

    private void sendActivationEmail(AppUser appUser) {
        String template = HtmlTemplateUtils.loadHtmlTemplate(activationEmailFile);
        String activationToken = appUser.getActivationToken()+"."+appUser.getId()+"."+UUID.randomUUID().toString();
        String activationLink = appBaseUrl+"/auth/user/email/activation?token="+activationToken;
        String htmlContent = template
                .replace("{{name}}", appUser.getFirstName())
                .replace("{{activationLink}}", activationLink)
                .replace("{{otp}}", appUser.getOtp());


        try {
            brevoService.sendEmail(
                    appUser,
                    "Wazi, Confirm your email address",
                    htmlContent
            );
        } catch (Exception e) {
            log.error("Error sending email with error {}", e.getMessage());
        }
    }

    private void sendOtpEmail(String usernameEmail, String otp) {
        String template = HtmlTemplateUtils.loadHtmlTemplate(otpEmailTemplate);
        String htmlContent = template
                .replace("{{otp}}", otp);
        AppUser appUser= AppUser.builder()
                .username(usernameEmail)
                .firstName("App User")
                .build();


        try {
            brevoService.sendEmail(
                    appUser,
                    "Wazi, Confirm your email address",
                    htmlContent
            );
        } catch (Exception e) {
            log.error("Error sending email with error {}", e.getMessage());
        }
    }

    public ResponseEntity<?> registerUserCourse(AppUserCourseReqDto userCourseDto, HttpServletRequest request) {
        AppUser user = new AppUser();
        user.setId(userCourseDto.getUserId());
        Course course = new Course();
        course.setId(userCourseDto.getCourseId());
        AppUserCourse userCourse = AppUserCourse.builder()
                .user(user)
                .course(course)
                .build();
        try {
            appUserCourseRepo.saveAndFlush(userCourse);
            userCourseDto.setId(userCourse.getId());
            userCourseDto.setCreatedAt(userCourse.getCreatedAt());
            return ResponseUtils.entryCreatedResponse(userCourse.getId(), "User Course");
        } catch (Exception e) {
            String errMessage = e.getMessage();
            if (errMessage.contains("unique_user_course")){
                errMessage = "User is already registered for this course";
            }
            return ResponseUtils.createErrorResponse(
                    request,
                    "Conflict",
                    errMessage,
                    409
            );
        }
    }

    public ResponseEntity<?> fetchUserCourseByUserId(HttpServletRequest request, String userId) {
        List<Course> courses = appUserCourseRepo.fetchCoursesByUserId(userId);
        List<CourseDto> dto = courses.stream().map(courseMapper::toDto).toList();

        return ResponseEntity.ok(dto);
    }

    public ResponseEntity<?> fetchUserFromCookie(HttpServletRequest request) {
        String accessToken = HttpRequestUtils.getAccessTokenFromCookie(request, "accessToken");
        String userId = jwtService.extractSpecificKey(accessToken, "uid");
        Optional<AppUser> _appUser = appUserRepo.findById(userId);
        AppUser appUser = _appUser.orElseThrow(() -> new RuntimeException("User not found"));
        UserDetailsExtended userDetails = AppUserUtils.getUserDetailsExtended(appUser);
        List<LearnerDto> learners = learnerService.fetchLearnersByUserId(request, userId);
        AppUserLoginResponseDto dto = getAppUserLoginResponseDto(learners, userDetails, appUser.getRole());
        return ResponseEntity.ok(dto);
    }

    public AppUser findByUsername(String username) {
        return appUserRepo.findByUsernameIgnoreCase(username).orElse(null);
    }

    public AppUser findById(String userId) {
        return appUserRepo.findById(userId).orElse(null);
    }

    public AppUser registerOAuth2User(String email, String names, String provider) {
        String[] namesArray = names.split(" ");
        String firstName = namesArray[0];
        String lastName = namesArray.length > 1 ? namesArray[1] : "";
        AppUser appUser = AppUser.builder()
                .username(email)
                .firstName(firstName)
                .lastName(lastName)
                .role("GUARDIAN")
                .loginProvider(provider.toUpperCase())
                .password(passwordEncoder.encode(UuidGenerator.generateEntityUuid("oauth2user")))
                .activated(true)
                .build();
        return appUserRepo.save(appUser);
    }



    public static AppUserLoginResponseDto getAppUserLoginResponseDto(List<LearnerDto> learners, UserDetailsExtended userDetails, String userRole) {
        return AppUserLoginResponseDto.builder()
                .learners(learners)
                .firstName(userDetails.getFirstName())
                .lastName(userDetails.getLastName())
                .id(userDetails.getId())
                .role(userRole)
                .username(userDetails.getUsername())
                .createdAt(userDetails.getCreatedAt())
                .userTimezone(userDetails.getUserTimezone())
                .phoneNumber(userDetails.getPhoneNumber())
                .build();
    }

    public void updateSuccessfullyLoggedIn(
            String tokenId, Instant loginAt, String refreshToken, Instant refreshTokenExpiry, String userId){
        appUserRepo.updateSuccessfullyLoggedIn(
                tokenId,
                loginAt,
                refreshToken,
                refreshTokenExpiry,
                userId
        );
    }

    public void createUser(AppUser user) {
        appUserRepo.save(user);
    }

    public List<AppUser> findByRefreshToken(String hashedToken) {
        return appUserRepo.findByRefreshToken(hashedToken);
    }

    public void activateUserViaActivationToken(HttpServletRequest request, HttpServletResponse response, String activationToKen) throws IOException {
        String urlLocation =  waziFrontEnd+"/activation";
        String failedUrl = urlLocation+"?error=true";
        String passUrl = urlLocation+"?error=false";
        if (activationToKen==null || activationToKen.isEmpty()){
            response.sendRedirect(failedUrl);
            return;
        }
        String[] split = activationToKen.split("\\.");
        if (split.length <2){
            response.sendRedirect(failedUrl);
            return;
        }
        String activationToken = split[0];
        String userId = split[1];
        Optional<AppUser> _user = appUserRepo.findById(userId);
        if (_user.isEmpty()){
            response.sendRedirect(failedUrl);
            return;
        }
        String dbToken = _user.get().getActivationToken();
        if (!dbToken.equalsIgnoreCase(activationToken)){
            response.sendRedirect(failedUrl);
            return;
        }
        appUserRepo.activateUserById(userId);
        response.sendRedirect(passUrl);
    }

    public CustomResponse activateUserViaOtp(
            HttpServletRequest request,
            HttpServletResponse response,
            OtpDto otpDto) throws IOException {
        String otp = otpDto.getOtp();
        String userId = otpDto.getUserId();
        if(StringUtils.isNullOrEmpty(otp) || StringUtils.isNullOrEmpty(userId)){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Invalid OTP or User ID")
                    .build();
        }
        Optional<AppUser> _user = appUserRepo.findById(userId);
        if (_user.isEmpty()){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("User not found")
                    .build();
        }
        //check if user is already active
        if (_user.get().getActivated()){
            return CustomResponse.builder()
                    .successful(true)
                    .errorMessage("User is already activated")
                    .build();
        }
        String dbOtp = _user.get().getOtp();

        if (!dbOtp.equalsIgnoreCase(otp)){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Invalid OTP")
                    .build();
        }
        appUserRepo.activateUserById(userId);
        return CustomResponse.builder()
                .successful(true)
                .errorMessage("User is activated")
                .build();
    }

    public CustomResponse updateUserPhoneNumber(AppUserDto appUserDto){
        String phoneNumber = appUserDto.getPhoneNumber();
        boolean validPhoneNumber = StringUtils.isValidPhoneNumber(phoneNumber);
        if (!validPhoneNumber){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Invalid phone number format")
                    .build();
        }

        String userId = appUserDto.getId();
        if (StringUtils.isNullOrEmpty(userId)){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("User ID is required")
                    .build();
        }

        appUserRepo.updateUserPhoneNumber(phoneNumber, userId);
        return CustomResponse.builder()
                .successful(true)
                .errorMessage("Phone number updated successfully")
                .build();

    }

    @Transactional
    public CustomResponse updateUserProfile(AppUserDto dto) {
        CriteriaBuilder criteria = entityManager.getCriteriaBuilder();
        CriteriaUpdate<AppUser> update = criteria.createCriteriaUpdate(AppUser.class);
        Root<AppUser> root = update.from(AppUser.class);
         if(!StringUtils.isNullOrEmpty(dto.getFirstName())){
             update.set("firstName", dto.getFirstName());
         }
         if(!StringUtils.isNullOrEmpty(dto.getLastName())){
             update.set("lastName", dto.getLastName());
         }
         if (!StringUtils.isNullOrEmpty(dto.getUserTimezone())){
             update.set("userTimezone", dto.getUserTimezone());
         }
         if (!StringUtils.isNullOrEmpty(dto.getRole())){
             update.set("role", dto.getRole());
         }
        if (!StringUtils.isNullOrEmpty(dto.getProfilePicture())){
            update.set("profilePicture", dto.getProfilePicture());
        }
        if (!StringUtils.isNullOrEmpty(dto.getCountryCode())){
            update.set("countryCode", dto.getCountryCode());
        }
         update.set("lastUpdated", Instant.now());
         update.where(criteria.equal(root.get("id"), dto.getId()));
         try {
             entityManager.createQuery(update).executeUpdate();
             return CustomResponse.builder()
                     .successful(true)
                     .errorMessage("Profile updated successfully")
                     .build();
         }catch (Exception e){
             return CustomResponse.builder()
                     .successful(false)
                     .errorMessage("Error updating profile: "+e.getMessage())
                     .build();
         }
    }

    public CustomResponse resetPasswordPublic(@Valid PasswordResetDto dto) {
        String username = dto.getUsername();
        String otp = dto.getOtp();

        if (!dto.getNewPassword().equalsIgnoreCase(dto.getNewPasswordConfirmation())){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Password confirmation do not match")
                    .build();
        }
        if (StringUtils.isNullOrEmpty(otp)){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Invalid OTP")
                    .build();
        }
        if (StringUtils.isNullOrEmpty(username)){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("username is required")
                    .build();
        }
        String hashedOtp = secureTokenGenerator.hashToken(otp);
        Long updateCount = appUserRepo.updatePasswordPublic(
                passwordEncoder.encode(dto.getNewPassword()),
                Instant.now(),
                username,
                dto.getPasswordResetToken(),
                hashedOtp
        );
        return CustomResponse.builder()
                .successful(updateCount > 0)
                .errorMessage(updateCount > 0 ? null : "Password reset failed")
                .data(updateCount > 0 ? "Password reset successful" : null)
                .build();
    }

    public CustomResponse resetPassword(String newPassword, String userId) {

        Long updateCount = appUserRepo.updatePassword(
                passwordEncoder.encode(newPassword),
                userId);
        return CustomResponse.builder()
                .successful(updateCount > 0)
                .errorMessage(updateCount > 0 ? null : "Password reset failed")
                .data(updateCount > 0 ? "Password reset successful" : null)
                .build();
    }

    public CustomResponse requestPasswordReset(PasswordResetDto dto) {
        String passwordResetToken = UuidGenerator.generateEntityUuid("password-reset");
        String otp = StringUtils.generateOtp(4, dto.getUsername());
        String passwordResetOtp = secureTokenGenerator.hashToken(otp);
        String username = dto.getUsername();
        if (StringUtils.isNullOrEmpty(username)){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("Username is required")
                    .build();
        }

        if(!rateLimiterService.tryConsumePasswordResetUsername(username)){
            return CustomResponse.builder()
                    .successful(false)
                    .errorMessage("TOO MANY PASSWORD RESET ATTEMPTS. TRY AGAIN AFTER 5 MINUTES")
                    .build();
        }
        dto.setPasswordResetToken(passwordResetToken);
        Long updateCount = appUserRepo.setPasswordResetDetails(passwordResetOtp, passwordResetToken, username);
        if (updateCount > 0){
            boolean isEmail = StringUtils.isValidEmail(username);
            if (isEmail){
                sendOtpEmail(username, otp);
            }else {
                sendPasswordReset(username, otp);
            }
        }


        return CustomResponse.builder()
                .successful(updateCount > 0)
                .errorMessage(updateCount > 0 ? null : "Password reset request failed")
                .data(updateCount > 0 ? dto : null)
                .build();
    }

    @EventListener
    @Async
    public void consumeEvent(CommunicationEvent event) throws InterruptedException {
        Thread.sleep(5000);
        log.info("AppUserService - Received event with message: {}", event.getMessage());
    }
}
