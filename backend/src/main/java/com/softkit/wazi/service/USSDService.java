package com.softkit.wazi.service;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.entities.Learner;
import com.softkit.wazi.entities.QuizResponse;
import com.softkit.wazi.repository.AppUserRepo;
import com.softkit.wazi.repository.LearnerRepo;
import com.softkit.wazi.repository.QuizResponseRepo;
import com.softkit.wazi.util.StringUtils;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class USSDService {

    private final ATService atService;
    private final LearnerService learnerService;
    private final QuizResponseRepo quizResponseRepo;
    private final LearnerRepo learnerRepo;
    private final AppUserRepo appUserRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${wazi.frontend-dashboard-url}")
    private String frontendUrl;

    /**
     * Main USSD handler. AT sends text as cumulative inputs joined by *.
     * e.g. if user selected 1, then typed "John", text = "1*John"
     */
    public String processUssd(String sessionId, String serviceCode,
                              String phoneNumber, String text) {

        log.info("USSD request — session:{} phone:{} text:'{}'", sessionId, phoneNumber, text);

        // ── Level 0: main menu ──────────────────────────────────────────────
        if (text == null || text.isEmpty()) {
            return mainMenu();
        }

        String[] parts = text.split("\\*", -1);
        String level1 = parts[0];

        // ── 1. Register ─────────────────────────────────────────────────────
        if (level1.equals("1")) {
            return handleRegistration(parts, phoneNumber, sessionId);
        }

        // ── 2. Enrol learner ────────────────────────────────────────────────
        if (level1.equals("2")) {
            return handleEnrolment(parts, phoneNumber, sessionId);
        }

        // ── 3. Take a quiz ──────────────────────────────────────────────────
        if (level1.equals("3")) {
            return handleQuiz(parts, phoneNumber, sessionId);
        }

        // ── 4. Check results / points ───────────────────────────────────────
        if (level1.equals("4")) {
            return handleResults(parts, phoneNumber);
        }

        // ── 5. Feedback ─────────────────────────────────────────────────────
        if (level1.equals("5")) {
            return handleFeedback(parts, phoneNumber, sessionId);
        }

        // ── 0. Exit ─────────────────────────────────────────────────────────
        if (level1.equals("0")) {
            return "END Thank you for using ShuleConnect. Goodbye!";
        }

        return "END Invalid selection. Please dial again.";
    }

    // ────────────────────────────────────────────────────────────────────────
    // MAIN MENU
    // ────────────────────────────────────────────────────────────────────────
    private String mainMenu() {
        return "CON Welcome to ShuleConnect\n" +
               "1. Register\n" +
               "2. Enrol learner\n" +
               "3. Take a quiz\n" +
               "4. Check results\n" +
               "5. Give feedback\n" +
               "0. Exit";
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1. REGISTRATION FLOW
    // ────────────────────────────────────────────────────────────────────────
    private String handleRegistration(String[] parts, String phoneNumber, String sessionId) {
        // 1       → ask for name
        if (parts.length == 1) {
            return "CON Enter your full name:";
        }

        // 1*Name  → ask for role
        if (parts.length == 2) {
            return "CON Select your role:\n1. Parent/Guardian\n2. Teacher\n3. Admin";
        }

        // 1*Name*role → confirm
        if (parts.length == 3) {
            String name = parts[1].trim();
            String roleChoice = parts[2].trim();
            String role = roleFromChoice(roleChoice);
            return "CON Confirm registration:\n" +
                   "Name: " + name + "\n" +
                   "Role: " + role + "\n" +
                   "Phone: " + phoneNumber + "\n" +
                   "1. Confirm\n2. Cancel";
        }

        // 1*Name*role*1 (confirmed)
        if (parts.length == 4 && parts[3].equals("1")) {
            String name    = parts[1].trim();
            String role    = roleFromChoice(parts[2].trim());
            String[] names = name.split(" ", 2);
            String first   = names[0];
            String last    = names.length > 1 ? names[1] : names[0];

            // Check if already registered
            Optional<AppUser> existing = appUserRepo.findByUsernameIgnoreCase(phoneNumber);
            if (existing.isPresent()) {
                return "END You already have an account. " +
                       "Visit " + frontendUrl + " to log in.";
            }

            // Create user
            AppUser user = AppUser.builder()
                    .username(phoneNumber.toUpperCase())
                    .password(passwordEncoder.encode("ShuleConnect@123")) // temp password
                    .firstName(first)
                    .lastName(last)
                    .role(role)
                    .phoneNumber(phoneNumber)
                    .countryCode("KE")
                    .activated(true) // activated directly via USSD
                    .userTimezone("Africa/Nairobi")
                    .build();
            appUserRepo.save(user);

            // Send confirmation SMS
            try {
                atService.sendSms(phoneNumber,
                    "Welcome to ShuleConnect! Account created for " + first +
                    ". Visit " + frontendUrl + " and login with " + phoneNumber +
                    ". Temp password: ShuleConnect@123");
            } catch (MessagingException e) {
                log.warn("Could not send registration SMS: {}", e.getMessage());
            }

            return "END Registration successful! " +
                   "Welcome " + first + "! " +
                   "An SMS with your login details has been sent.";
        }

        // 1*Name*role*2 (cancelled)
        if (parts.length == 4 && parts[3].equals("2")) {
            return "END Registration cancelled. Dial again when ready.";
        }

        return "END Invalid input. Please dial again.";
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. ENROLMENT FLOW
    // ────────────────────────────────────────────────────────────────────────
    private String handleEnrolment(String[] parts, String phoneNumber, String sessionId) {
        // 2 → ask for learner ID
        if (parts.length == 1) {
            return "CON Enter learner ID\n(found in your ShuleConnect app):";
        }

        // 2*learnerId → look up learner and confirm
        if (parts.length == 2) {
            String learnerId = parts[1].trim();
            Optional<Learner> learnerOpt = learnerRepo.findById(learnerId);
            if (learnerOpt.isEmpty()) {
                return "END Learner ID " + learnerId + " not found.\n" +
                       "Please check the ID in the ShuleConnect app.";
            }
            Learner learner = learnerOpt.get();
            String name = learner.getFirstName() + " " + learner.getLastName();
            String grade = learner.getGrade() != null ? learner.getGrade().getName() : "N/A";
            return "CON Learner found:\n" +
                   "Name: " + name + "\n" +
                   "Grade: " + grade + "\n" +
                   "1. Confirm enrolment\n2. Cancel";
        }

        // 2*learnerId*1 → confirmed
        if (parts.length == 3 && parts[2].equals("1")) {
            String learnerId = parts[1].trim();
            Optional<Learner> learnerOpt = learnerRepo.findById(learnerId);
            if (learnerOpt.isEmpty()) {
                return "END Learner not found. Please try again.";
            }
            Learner learner = learnerOpt.get();
            String name = learner.getFirstName();

            try {
                atService.sendSms(phoneNumber,
                    "ShuleConnect: Enrolment confirmed for " + name +
                    ". They can now access lessons on the app.");
            } catch (MessagingException e) {
                log.warn("Could not send enrolment SMS: {}", e.getMessage());
            }

            return "END Enrolment confirmed for " + name + "!\n" +
                   "An SMS confirmation has been sent to your phone.";
        }

        // 2*learnerId*2 → cancelled
        if (parts.length == 3 && parts[2].equals("2")) {
            return "END Enrolment cancelled.";
        }

        return "END Invalid input. Please dial again.";
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. QUIZ FLOW
    // ────────────────────────────────────────────────────────────────────────
    private String handleQuiz(String[] parts, String phoneNumber, String sessionId) {
        // 3 → ask for learner ID
        if (parts.length == 1) {
            return "CON Enter your learner ID:";
        }

        // 3*learnerId → ask for quiz code
        if (parts.length == 2) {
            String learnerId = parts[1].trim();
            Optional<Learner> learnerOpt = learnerRepo.findById(learnerId);
            if (learnerOpt.isEmpty()) {
                return "END Learner ID not found. Please check and try again.";
            }
            return "CON Welcome " + learnerOpt.get().getFirstName() + "!\n" +
                   "Enter quiz code\n(given by your teacher):";
        }

        // 3*learnerId*quizCode → quiz question 1
        if (parts.length == 3) {
            return "CON Quiz started!\n" +
                   "Q1: Type your answer and press Send.\n" +
                   "Enter 0 to finish quiz.";
        }

        // 3*learnerId*quizCode*answer → save and ask next or finish
        if (parts.length >= 4) {
            String learnerId = parts[1].trim();
            String quizCode  = parts[2].trim();
            String answer    = parts[parts.length - 1].trim();

            if (answer.equals("0")) {
                // Count answers submitted
                List<QuizResponse> responses = quizResponseRepo
                        .findBySessionId(sessionId);
                int count = responses.size();

                try {
                    Optional<Learner> learner = learnerRepo.findById(learnerId);
                    if (learner.isPresent()) {
                        String name = learner.get().getFirstName();
                        atService.sendSms(phoneNumber,
                            "ShuleConnect Quiz: " + name + " completed quiz " +
                            quizCode + " with " + count + " answer(s) submitted.");
                    }
                } catch (MessagingException e) {
                    log.warn("Could not send quiz SMS: {}", e.getMessage());
                }

                return "END Quiz completed! " + count +
                       " answer(s) submitted. Well done!";
            }

            // Save answer
            QuizResponse response = QuizResponse.builder()
                    .sessionId(sessionId)
                    .phoneNumber(phoneNumber)
                    .quizCode(quizCode)
                    .answer(answer)
                    .build();
            quizResponseRepo.save(response);

            int questionNum = parts.length - 2; // how many answered so far
            return "CON Answer " + questionNum + " recorded!\n" +
                   "Enter next answer or\n0 to finish quiz.";
        }

        return "END Invalid quiz input. Please dial again.";
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. RESULTS FLOW
    // ────────────────────────────────────────────────────────────────────────
    private String handleResults(String[] parts, String phoneNumber) {
        // 4 → ask for learner ID
        if (parts.length == 1) {
            return "CON Enter learner ID:";
        }

        // 4*learnerId → show results
        if (parts.length == 2) {
            String learnerId = parts[1].trim();
            Optional<Learner> learnerOpt = learnerRepo.findById(learnerId);
            if (learnerOpt.isEmpty()) {
                return "END Learner ID not found.\nPlease check and try again.";
            }
            Learner learner = learnerOpt.get();
            long points = learner.getPoints() != null ? learner.getPoints() : 0L;
            String name = learner.getFirstName() + " " + learner.getLastName();
            String grade = learner.getGrade() != null ? learner.getGrade().getName() : "N/A";

            return "END Results for " + name + ":\n" +
                   "Grade: " + grade + "\n" +
                   "Points: " + points + "\n" +
                   "Keep learning on ShuleConnect!";
        }

        return "END Invalid input. Please dial again.";
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. FEEDBACK FLOW
    // ────────────────────────────────────────────────────────────────────────
    private String handleFeedback(String[] parts, String phoneNumber, String sessionId) {
        // 5 → what feedback?
        if (parts.length == 1) {
            return "CON What feedback would you like to give?\n" +
                   "1. Rate lesson quality\n" +
                   "2. Report an issue\n" +
                   "3. General suggestion";
        }

        String feedbackType = parts[1].trim();

        // 5*1 → rate lesson
        if (feedbackType.equals("1")) {
            if (parts.length == 2) {
                return "CON Rate the last lesson\n(1=Poor, 5=Excellent):";
            }
            if (parts.length == 3) {
                String rating = parts[2].trim();
                saveFeedback(sessionId, phoneNumber, "LESSON_RATING", rating);
                return "END Thank you! Rating of " + rating +
                       " recorded. We appreciate your feedback!";
            }
        }

        // 5*2 → report issue
        if (feedbackType.equals("2")) {
            if (parts.length == 2) {
                return "CON Describe the issue briefly\n(max 100 characters):";
            }
            if (parts.length == 3) {
                String issue = parts[2].trim();
                saveFeedback(sessionId, phoneNumber, "ISSUE_REPORT", issue);
                return "END Issue reported: \"" + truncate(issue, 50) +
                       "\". Our team will review it. Thank you!";
            }
        }

        // 5*3 → suggestion
        if (feedbackType.equals("3")) {
            if (parts.length == 2) {
                return "CON Type your suggestion\n(max 100 characters):";
            }
            if (parts.length == 3) {
                String suggestion = parts[2].trim();
                saveFeedback(sessionId, phoneNumber, "SUGGESTION", suggestion);
                return "END Suggestion received: \"" + truncate(suggestion, 50) +
                       "\". Thank you for helping improve ShuleConnect!";
            }
        }

        return "END Invalid selection. Please dial again.";
    }

    // ────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ────────────────────────────────────────────────────────────────────────
    private String roleFromChoice(String choice) {
        return switch (choice) {
            case "1" -> "GUARDIAN";
            case "2" -> "TEACHER";
            case "3" -> "ADMIN";
            default  -> "GUARDIAN";
        };
    }

    private void saveFeedback(String sessionId, String phoneNumber,
                              String type, String content) {
        QuizResponse feedback = QuizResponse.builder()
                .sessionId(sessionId)
                .phoneNumber(phoneNumber)
                .quizCode(type)
                .answer(content)
                .build();
        quizResponseRepo.save(feedback);
        log.info("Feedback saved — type:{} phone:{}", type, phoneNumber);
    }

    private String truncate(String text, int max) {
        return text.length() > max ? text.substring(0, max) + "..." : text;
    }
}
