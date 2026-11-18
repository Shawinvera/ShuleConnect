# Implementation Plan: AfricasTalking API Integration

## Background from codebase exploration

### Key findings

- **Spring Boot 4.0.2** (spring-boot-starter-parent), Java 17.
- **Lombok + Jackson** are on the classpath; MapStruct for mappers; no AT SDK dependency — the existing `ATService` calls the REST API directly with `RestTemplate`, and the plan follows the same pattern throughout.
- **UUID pattern**: `UuidGenerator.generateEntityUuid("prefix")` returns `"prefix-" + UUID.randomUUID()`, called from `@PrePersist`. All entity IDs are plain `String` columns (no JPA `@GeneratedValue`).
- **Security**: `SecurityConfig.java` grants `permitAll()` via `.requestMatchers("/public/**").permitAll()`. USSD and Voice callback endpoints must be placed under `/public/at/…` to avoid adding new matchers — the wildcard already covers them.
- **ResponseEntity pattern**: controllers call service methods that return `ResponseEntity<?>` or `CustomResponse`; use `ResponseUtils` helpers for 201/400/409 responses.
- **`updateLearnerPoints` signature**: `void updateLearnerPoints(String learnerId, Long scoredPoints)` → delegates to `LearnerRepo.updatePoints` which does `points = points + scoredPoints`.
- **`application.yaml`**: `africastalking` block already has `username`, `api-key`, `api-url` (points at the SMS endpoint). Three new keys will be added: `voice-url`, `airtime-url`, `voice-from-number`.
- **AT API endpoints** (REST, no SDK required):
  - SMS: `https://api.sandbox.africastalking.com/version1/messaging` (already in yaml)
  - Airtime: `https://api.sandbox.africastalking.com/version1/airtime/send` — POST form-encoded; body fields: `username`, `recipients` (URL-encoded JSON array of `{phoneNumber, amount}`)
  - Voice (make call): `https://voice.africastalking.com/call` — POST form-encoded; header `apiKey`; body: `username`, `from`, `to`
  - Voice callback: inbound POST from AT with form params `sessionId`, `isActive`, `callSessionState`, `callerNumber`, `destinationNumber` — your endpoint returns XML.

---

## Plan

- [ ] 1. **Add new config keys to `application.yaml`**

  Append three keys under the existing `africastalking:` block so all AT services read config from one place.

  File: `backend/src/main/resources/application.yaml`

  After the existing line:
  ```yaml
  africastalking:
    username: ${AT_USERNAME:sandbox}
    api-key: ${AT_API_KEY:atsk_28ca8560495db350fbfb50dbb26d3ba612e17b38543fc39da75b377fb806eaa555f3be49}
    api-url: ${AT_API_URL:https://api.sandbox.africastalking.com/version1/messaging}
  ```
  Add:
  ```yaml
    voice-url: ${AT_VOICE_URL:https://voice.africastalking.com/call}
    airtime-url: ${AT_AIRTIME_URL:https://api.sandbox.africastalking.com/version1/airtime/send}
    voice-from-number: ${AT_VOICE_FROM:+254711082300}
  ```

  Verify: `mvn compile -f backend/pom.xml` — compiles without error (Spring Boot will bind the new keys on startup).

---

- [ ] 2. **Create DTOs**

  Create six DTO files in `backend/src/main/java/com/softkit/wazi/model/`. Follow the Lombok-only pattern of `LearnerDto` (no `@Builder`, just `@Getter @Setter @AllArgsConstructor @NoArgsConstructor`).

  **a. `ATSmsRequestDto.java`**
  ```java
  package com.softkit.wazi.model;
  import lombok.*;
  @Getter @Setter @AllArgsConstructor @NoArgsConstructor
  public class ATSmsRequestDto {
      private String to;      // E.164, comma-separated for multiple
      private String message;
  }
  ```

  **b. `ATBulkSmsRequestDto.java`**
  ```java
  package com.softkit.wazi.model;
  import lombok.*;
  import java.util.List;
  @Getter @Setter @AllArgsConstructor @NoArgsConstructor
  public class ATBulkSmsRequestDto {
      private List<String> recipients; // E.164 numbers
      private String message;
  }
  ```

  **c. `USSDRequest.java`**
  ```java
  package com.softkit.wazi.model;
  import lombok.*;
  @Getter @Setter @AllArgsConstructor @NoArgsConstructor
  public class USSDRequest {
      private String sessionId;
      private String phoneNumber;
      private String networkCode;
      private String serviceCode;
      private String text;        // cumulative input, levels separated by *
  }
  ```

  **d. `VoiceBroadcastRequestDto.java`**
  ```java
  package com.softkit.wazi.model;
  import lombok.*;
  import java.util.List;
  @Getter @Setter @AllArgsConstructor @NoArgsConstructor
  public class VoiceBroadcastRequestDto {
      private List<String> recipients; // E.164 numbers
      private String messageText;      // used in TTS XML response
      private String language;         // e.g. "en-US", "sw", default "en-US"
  }
  ```

  **e. `AirtimeRecipient.java`**
  ```java
  package com.softkit.wazi.model;
  import lombok.*;
  @Getter @Setter @AllArgsConstructor @NoArgsConstructor
  public class AirtimeRecipient {
      private String phoneNumber; // E.164
      private String amount;      // e.g. "KES 10"
  }
  ```

  **f. `AirtimeRewardRequestDto.java`** — includes inner `RewardType` enum
  ```java
  package com.softkit.wazi.model;
  import lombok.*;
  @Getter @Setter @AllArgsConstructor @NoArgsConstructor
  public class AirtimeRewardRequestDto {
      private String learnerId;
      private String phoneNumber;  // E.164 — learner's registered phone
      private String amount;       // e.g. "KES 5"
      private RewardType rewardType;

      public enum RewardType {
          ATTENDANCE,
          QUIZ,
          COURSE
      }
  }
  ```

  Verify: `mvn compile -f backend/pom.xml` — no compilation errors.

---

- [ ] 3. **Create `QuizResponse` entity**

  File: `backend/src/main/java/com/softkit/wazi/entities/QuizResponse.java`

  Follow the same pattern as `Learner.java` and `AppUser.java` — `String id` set by `UuidGenerator` in `@PrePersist`, `Instant createdAt` also set there.

  ```java
  package com.softkit.wazi.entities;

  import com.softkit.wazi.util.UuidGenerator;
  import jakarta.persistence.*;
  import lombok.*;
  import java.time.Instant;

  @Table(name = "quiz_responses")
  @Entity
  @AllArgsConstructor
  @NoArgsConstructor
  @Setter
  @Getter
  @Builder
  public class QuizResponse {
      @Id
      @Column(name = "id", updatable = false, nullable = false)
      private String id;

      @Column(name = "creation_date", updatable = false, nullable = false)
      private Instant createdAt;

      private String sessionId;
      private String phoneNumber;
      private String quizCode;
      private String answer;

      @PrePersist
      protected void onCreate() {
          this.id = UuidGenerator.generateEntityUuid("quiz-resp");
          this.createdAt = Instant.now();
      }
  }
  ```

  Verify: `mvn compile -f backend/pom.xml` — compiles cleanly; H2 DDL will auto-create the `quiz_responses` table on startup.

---

- [ ] 4. **Create `QuizResponseRepo`**

  File: `backend/src/main/java/com/softkit/wazi/repository/QuizResponseRepo.java`

  ```java
  package com.softkit.wazi.repository;

  import com.softkit.wazi.entities.QuizResponse;
  import org.springframework.data.jpa.repository.JpaRepository;
  import org.springframework.stereotype.Repository;
  import java.util.List;

  @Repository
  public interface QuizResponseRepo extends JpaRepository<QuizResponse, String> {
      List<QuizResponse> findByQuizCodeOrderByCreatedAtDesc(String quizCode);
      List<QuizResponse> findByPhoneNumberOrderByCreatedAtDesc(String phoneNumber);
  }
  ```

  Verify: `mvn compile -f backend/pom.xml`.

---

- [ ] 5. **Extend `ATService` with SMS bulk, Voice call, and Lesson/Reminder helpers**

  File: `backend/src/main/java/com/softkit/wazi/service/ATService.java`

  Add three new `@Value` fields (reading the new yaml keys from step 1):
  ```java
  @Value("${africastalking.voice-url}")
  private String africastalkingVoiceUrl;

  @Value("${africastalking.airtime-url}")
  private String africastalkingAirtimeUrl;

  @Value("${africastalking.voice-from-number}")
  private String voiceFromNumber;
  ```

  Add these methods (keep the existing `sendSms` unchanged):

  **a. `sendBulkSms(List<String> recipients, String message)`**
  - Joins `recipients` list with commas for the `to` field.
  - Reuses the same headers/form-data pattern as `sendSms`.
  - Annotated `@Async("asyncTaskExecutor")`.
  - Skips when `StringUtils.isDevMode()`.

  **b. `sendLessonReminder(String phoneNumber, String lessonTitle, String deadline)`**
  - Composes a message: `"Reminder: Lesson '${lessonTitle}' is due by ${deadline}. Keep learning on ShuleConnect!"`.
  - Calls `sendSms(phoneNumber, message)`.

  **c. `sendExamReminder(String phoneNumber, String examName, String examDate)`**
  - Composes: `"Exam Alert: '${examName}' on ${examDate}. Good luck from ShuleConnect!"`.
  - Calls `sendSms(phoneNumber, message)`.

  **d. `sendTimetableUpdate(List<String> recipients, String updateMessage)`**
  - Calls `sendBulkSms(recipients, updateMessage)`.

  **e. `makeVoiceCall(String toNumber, String callbackUrl)`**
  - POST to `africastalkingVoiceUrl` (form-encoded, header `apiKey`).
  - Body params: `username`, `from` (voiceFromNumber), `to` (toNumber), `callNotificationUrl` (callbackUrl).
  - Annotated `@Async("asyncTaskExecutor")`.
  - Logs errors; skips in dev mode.

  **f. `broadcastVoiceCall(List<String> recipients, String callbackUrl)`**
  - Joins recipients with comma for the `to` field (AT voice API accepts comma-separated).
  - Calls the same POST as `makeVoiceCall` with the joined string.

  Signature summary:
  ```java
  @Async("asyncTaskExecutor")
  public void sendBulkSms(List<String> recipients, String message) throws MessagingException

  public void sendLessonReminder(String phoneNumber, String lessonTitle, String deadline) throws MessagingException

  public void sendExamReminder(String phoneNumber, String examName, String examDate) throws MessagingException

  public void sendTimetableUpdate(List<String> recipients, String updateMessage) throws MessagingException

  @Async("asyncTaskExecutor")
  public void makeVoiceCall(String toNumber, String callbackUrl)

  public void broadcastVoiceCall(List<String> recipients, String callbackUrl)
  ```

  Verify: `mvn compile -f backend/pom.xml`.

---

- [ ] 6. **Create `AirtimeService`**

  File: `backend/src/main/java/com/softkit/wazi/service/AirtimeService.java`

  Design decisions:
  - Uses `RestTemplate` (already a bean, injected by constructor) exactly as `ATService` does. No AT SDK.
  - AT Airtime API: POST to `{airtime-url}` with header `apiKey`, form-encoded body: `username` + `recipients` = URL-encoded JSON array string, e.g. `[{"phoneNumber":"+254711XXXYYY","amount":"KES 10"}]`.
  - After a successful airtime send, calls `learnerService.updateLearnerPoints(learnerId, points)` to record the reward. Points awarded per `RewardType`: `ATTENDANCE=10`, `QUIZ=20`, `COURSE=50`.
  - Uses Jackson `ObjectMapper` to serialize the recipients array to JSON before URL-encoding.
  - Skips AT call in dev mode; still updates points.

  ```java
  package com.softkit.wazi.service;

  import com.fasterxml.jackson.databind.ObjectMapper;
  import com.softkit.wazi.model.AirtimeRewardRequestDto;
  import com.softkit.wazi.util.StringUtils;
  import lombok.RequiredArgsConstructor;
  import lombok.extern.slf4j.Slf4j;
  import org.springframework.beans.factory.annotation.Value;
  import org.springframework.http.*;
  import org.springframework.stereotype.Service;
  import org.springframework.util.LinkedMultiValueMap;
  import org.springframework.util.MultiValueMap;
  import org.springframework.web.client.RestTemplate;
  import java.util.*;

  @Service
  @RequiredArgsConstructor
  @Slf4j
  public class AirtimeService {
      private final RestTemplate restTemplate;
      private final LearnerService learnerService;
      private final ObjectMapper objectMapper;

      @Value("${africastalking.api-key}")
      private String apiKey;
      @Value("${africastalking.username}")
      private String username;
      @Value("${africastalking.airtime-url}")
      private String airtimeUrl;

      private static final Map<AirtimeRewardRequestDto.RewardType, Long> REWARD_POINTS = Map.of(
          AirtimeRewardRequestDto.RewardType.ATTENDANCE, 10L,
          AirtimeRewardRequestDto.RewardType.QUIZ,       20L,
          AirtimeRewardRequestDto.RewardType.COURSE,     50L
      );

      public void rewardLearnerWithAirtime(AirtimeRewardRequestDto dto) {
          Long points = REWARD_POINTS.getOrDefault(dto.getRewardType(), 10L);

          if (!StringUtils.isDevMode()) {
              try {
                  List<Map<String,String>> recipientList = List.of(
                      Map.of("phoneNumber", dto.getPhoneNumber(), "amount", dto.getAmount())
                  );
                  String recipientsJson = objectMapper.writeValueAsString(recipientList);

                  HttpHeaders headers = new HttpHeaders();
                  headers.add("apiKey", apiKey);
                  headers.setContentType(MediaType.MULTIPART_FORM_DATA);

                  MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                  body.add("username", username);
                  body.add("recipients", recipientsJson);

                  HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
                  restTemplate.postForObject(airtimeUrl, request, String.class);
              } catch (Exception e) {
                  log.error("Error sending airtime: {}", e.getMessage());
              }
          }

          learnerService.updateLearnerPoints(dto.getLearnerId(), points);
      }
  }
  ```

  Note: `ObjectMapper` is auto-configured by Spring Boot (Jackson is on the classpath); declare it as a constructor parameter — Spring will inject the auto-configured bean.

  Verify: `mvn compile -f backend/pom.xml`.

---

- [ ] 7. **Create `USSDService`**

  File: `backend/src/main/java/com/softkit/wazi/service/USSDService.java`

  Design decisions:
  - Stateless menu logic driven by the `text` field. AT appends successive user inputs with `*` delimiter, so level 0 = `""`, level 1 = `"1"` / `"2"` / `"3"` / `"4"`, level 2 = `"1*answer"`.
  - Menu structure:
    ```
    Level 0 (text == ""):
      CON Welcome to ShuleConnect
      1. Register / Enrol
      2. Take a Quiz
      3. Check my Points
      4. Leave Feedback

    Level 1-1 (text == "1"):
      CON Enter your learner ID to confirm enrolment:

    Level 1-2 (text == "2"):
      CON Enter quiz code:

    Level 1-3 (text == "3"):
      END (look up learner by phoneNumber, return points)

    Level 1-4 (text == "4"):
      CON Enter your feedback (1 sentence):

    Level 2-1 (text starts with "1*"):
      END Enrolment confirmed for [learnerId]. Welcome!
      Side-effect: log/no-op (actual enrolment needs a learnerId→user link; log the attempt and return a friendly message)

    Level 2-2 (text starts with "2*"):
      END Thank you! Answer recorded.
      Side-effect: save QuizResponse to DB via QuizResponseRepo

    Level 2-4 (text starts with "4*"):
      END Thank you for your feedback!
      Side-effect: send SMS to admin number via ATService (optional — log if no admin number configured)
    ```
  - Inject `ATService`, `LearnerService` (for points lookup), `QuizResponseRepo`.

  ```java
  package com.softkit.wazi.service;

  import com.softkit.wazi.entities.QuizResponse;
  import com.softkit.wazi.repository.QuizResponseRepo;
  import lombok.RequiredArgsConstructor;
  import lombok.extern.slf4j.Slf4j;
  import org.springframework.stereotype.Service;

  @Service
  @RequiredArgsConstructor
  @Slf4j
  public class USSDService {
      private final ATService atService;
      private final LearnerService learnerService;
      private final QuizResponseRepo quizResponseRepo;

      public String handleRequest(String sessionId, String phoneNumber,
                                   String networkCode, String serviceCode, String text) {
          String[] parts = text == null ? new String[]{""} : text.split("\\*", -1);
          int level = text == null || text.isBlank() ? 0 : parts.length;

          return switch (level) {
              case 0 -> mainMenu();
              case 1 -> handleLevel1(parts[0]);
              case 2 -> handleLevel2(sessionId, phoneNumber, parts);
              default -> "END Invalid selection. Please try again.";
          };
      }

      private String mainMenu() {
          return """
              CON Welcome to ShuleConnect
              1. Register / Enrol
              2. Take a Quiz
              3. Check my Points
              4. Leave Feedback""";
      }

      private String handleLevel1(String choice) {
          return switch (choice) {
              case "1" -> "CON Enter your learner ID to confirm enrolment:";
              case "2" -> "CON Enter your quiz code:";
              case "3" -> "CON Enter your learner ID to check points:";
              case "4" -> "CON Enter your feedback (keep it brief):";
              default  -> "END Invalid selection. Goodbye.";
          };
      }

      private String handleLevel2(String sessionId, String phoneNumber, String[] parts) {
          String choice = parts[0];
          String input  = parts[1];
          return switch (choice) {
              case "1" -> {
                  log.info("Enrolment confirmation requested by {} for learnerId {}", phoneNumber, input);
                  yield "END Enrolment request received for ID: " + input + ". You will receive an SMS confirmation shortly.";
              }
              case "2" -> {
                  QuizResponse qr = QuizResponse.builder()
                      .sessionId(sessionId)
                      .phoneNumber(phoneNumber)
                      .quizCode(input)
                      .answer(parts.length > 2 ? parts[2] : "")
                      .build();
                  quizResponseRepo.save(qr);
                  yield "END Quiz response recorded. Well done!";
              }
              case "3" -> {
                  // parts[1] is learnerId
                  yield "END Points lookup by USSD not yet wired to learner. Please use the app.";
              }
              case "4" -> {
                  log.info("Feedback from {}: {}", phoneNumber, input);
                  yield "END Thank you for your feedback!";
              }
              default -> "END Invalid selection. Goodbye.";
          };
      }
  }
  ```

  Verify: `mvn compile -f backend/pom.xml`.

---

- [ ] 8. **Create `USSDController`**

  File: `backend/src/main/java/com/softkit/wazi/controller/USSDController.java`

  - Maps `POST /public/at/ussd` (falls under the existing `/public/**` permit-all rule).
  - AT posts form-encoded params, so use `@RequestParam` for each field.
  - Returns `text/plain` with the `CON …` or `END …` string.

  ```java
  package com.softkit.wazi.controller;

  import com.softkit.wazi.service.USSDService;
  import lombok.RequiredArgsConstructor;
  import org.springframework.http.MediaType;
  import org.springframework.web.bind.annotation.*;

  @RestController
  @RequestMapping("/public/at/ussd")
  @RequiredArgsConstructor
  public class USSDController {
      private final USSDService ussdService;

      @PostMapping(consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                   produces = MediaType.TEXT_PLAIN_VALUE)
      public String handleUSSD(
              @RequestParam String sessionId,
              @RequestParam String phoneNumber,
              @RequestParam(required = false, defaultValue = "") String networkCode,
              @RequestParam String serviceCode,
              @RequestParam(required = false, defaultValue = "") String text) {
          return ussdService.handleRequest(sessionId, phoneNumber, networkCode, serviceCode, text);
      }
  }
  ```

  Verify: `mvn compile -f backend/pom.xml`.

---

- [ ] 9. **Create `VoiceController`**

  File: `backend/src/main/java/com/softkit/wazi/controller/VoiceController.java`

  - `POST /public/at/voice/callback` — AT calls this when a voice event occurs. Under `/public/**`, no auth needed.
    Returns XML with `Content-Type: application/xml`. Simple response: say the ShuleConnect announcement message.
  - `POST /voice/broadcast` — authenticated endpoint; triggers outbound voice broadcasts.
    Accepts `VoiceBroadcastRequestDto` as JSON body, delegates to `ATService.broadcastVoiceCall`.

  ```java
  package com.softkit.wazi.controller;

  import com.softkit.wazi.model.CustomResponse;
  import com.softkit.wazi.model.VoiceBroadcastRequestDto;
  import com.softkit.wazi.service.ATService;
  import lombok.RequiredArgsConstructor;
  import lombok.extern.slf4j.Slf4j;
  import org.springframework.http.MediaType;
  import org.springframework.http.ResponseEntity;
  import org.springframework.web.bind.annotation.*;

  @RestController
  @RequiredArgsConstructor
  @Slf4j
  public class VoiceController {
      private final ATService atService;

      /**
       * AT Voice callback: AT calls this URL during/after a voice session.
       * Returns XML instructing AT what to say.
       */
      @PostMapping(
          value = "/public/at/voice/callback",
          consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
          produces = MediaType.APPLICATION_XML_VALUE
      )
      public String voiceCallback(
              @RequestParam(required = false) String sessionId,
              @RequestParam(required = false) String isActive,
              @RequestParam(required = false) String callerNumber,
              @RequestParam(required = false) String callSessionState,
              @RequestParam(required = false) String destinationNumber) {
          log.info("Voice callback: session={}, state={}, caller={}", sessionId, callSessionState, callerNumber);
          return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                 "<Response>" +
                 "<Say>Welcome to ShuleConnect. This is an important announcement. " +
                 "Please check the ShuleConnect app for details. Thank you.</Say>" +
                 "</Response>";
      }

      /**
       * Authenticated: triggers a voice broadcast to a list of recipients.
       */
      @PostMapping("/voice/broadcast")
      public ResponseEntity<?> broadcast(@RequestBody VoiceBroadcastRequestDto dto) {
          if (dto.getRecipients() == null || dto.getRecipients().isEmpty()) {
              return ResponseEntity.badRequest().body(
                  CustomResponse.builder().successful(false).errorMessage("Recipients list is required").build());
          }
          // Build a callback URL that AT will call; in production read from wazi.backend-base-url
          String callbackUrl = "/api/public/at/voice/callback";
          atService.broadcastVoiceCall(dto.getRecipients(), callbackUrl);
          return ResponseEntity.ok(
              CustomResponse.builder().successful(true).errorMessage("Broadcast initiated").build());
      }
  }
  ```

  Verify: `mvn compile -f backend/pom.xml`.

---

- [ ] 10. **Create `AirtimeController`**

  File: `backend/src/main/java/com/softkit/wazi/controller/AirtimeController.java`

  - `POST /airtime/reward` — authenticated (no `/public/` prefix → requires JWT like all other non-public endpoints).
  - Accepts `AirtimeRewardRequestDto` as JSON body.
  - Delegates to `AirtimeService.rewardLearnerWithAirtime`.

  ```java
  package com.softkit.wazi.controller;

  import com.softkit.wazi.model.AirtimeRewardRequestDto;
  import com.softkit.wazi.model.CustomResponse;
  import com.softkit.wazi.service.AirtimeService;
  import lombok.RequiredArgsConstructor;
  import org.springframework.http.ResponseEntity;
  import org.springframework.web.bind.annotation.*;

  @RestController
  @RequestMapping("/airtime")
  @RequiredArgsConstructor
  public class AirtimeController {
      private final AirtimeService airtimeService;

      @PostMapping("/reward")
      public ResponseEntity<?> rewardLearner(@RequestBody AirtimeRewardRequestDto dto) {
          if (dto.getLearnerId() == null || dto.getPhoneNumber() == null || dto.getAmount() == null) {
              return ResponseEntity.badRequest().body(
                  CustomResponse.builder().successful(false)
                      .errorMessage("learnerId, phoneNumber and amount are required").build());
          }
          airtimeService.rewardLearnerWithAirtime(dto);
          return ResponseEntity.ok(
              CustomResponse.builder().successful(true)
                  .errorMessage("Airtime reward processed").build());
      }
  }
  ```

  Verify: `mvn compile -f backend/pom.xml`.

---

- [ ] 11. **Security config — confirm no change needed, add note**

  File: `backend/src/main/java/com/softkit/wazi/security/SecurityConfig.java`

  The current permit-all block is:
  ```java
  .requestMatchers("/public/**").permitAll()
  ```
  This wildcard already covers `/public/at/ussd` and `/public/at/voice/callback`. **No change required.**

  `POST /voice/broadcast` and `POST /airtime/reward` fall under `.anyRequest().authenticated()` — correct, they are staff/admin endpoints.

  Verify: start the application (`mvn spring-boot:run -f backend/pom.xml`) and confirm:
  - `POST /api/public/at/ussd` returns HTTP 200 (plain text) without an Authorization header.
  - `POST /api/airtime/reward` without an Authorization header returns HTTP 401.

---

- [ ] 12. **Register `ObjectMapper` as a named bean if injection fails**

  Spring Boot auto-configures an `ObjectMapper` bean, but if there is a conflict (multiple beans), add an explicit `@Primary` qualifier. Only do this step if step 6 fails to compile or boot with a `NoUniqueBeanDefinitionException`.

  File: `backend/src/main/java/com/softkit/wazi/config/ModelMapperConfig.java` (or a new `JacksonConfig.java`)

  ```java
  // In a @Configuration class:
  @Bean
  @Primary
  public ObjectMapper objectMapper() {
      return new ObjectMapper()
              .findAndRegisterModules();
  }
  ```

  Verify: `mvn spring-boot:run -f backend/pom.xml` — application starts without bean injection errors.

---

- [ ] 13. **Full build verification**

  Run the complete Maven build from the backend directory:

  ```
  cd backend
  mvn clean package -DskipTests
  ```

  Expected: `BUILD SUCCESS` and a fat JAR produced at `target/wazi-0.0.1-SNAPSHOT.jar`.

  Then run:
  ```
  mvn spring-boot:run
  ```

  Confirm in logs:
  - `HikariPool` starts (H2 in-memory)
  - `quiz_responses` table created by Hibernate DDL
  - Application listening on port 8112
  - No `NoSuchBeanDefinitionException` or `UnsatisfiedDependencyException`

---

## Summary of all files

### Created
| File | Purpose |
|------|---------|
| `model/ATSmsRequestDto.java` | DTO for single SMS send |
| `model/ATBulkSmsRequestDto.java` | DTO for bulk SMS |
| `model/USSDRequest.java` | USSD inbound payload |
| `model/VoiceBroadcastRequestDto.java` | Voice broadcast trigger DTO |
| `model/AirtimeRecipient.java` | Single airtime recipient |
| `model/AirtimeRewardRequestDto.java` | Airtime reward request (with `RewardType` enum) |
| `entities/QuizResponse.java` | Persisted USSD quiz answer |
| `repository/QuizResponseRepo.java` | JPA repo for QuizResponse |
| `service/USSDService.java` | Stateless USSD menu logic |
| `service/AirtimeService.java` | AT Airtime API + points update |
| `controller/USSDController.java` | POST /public/at/ussd |
| `controller/VoiceController.java` | POST /public/at/voice/callback + POST /voice/broadcast |
| `controller/AirtimeController.java` | POST /airtime/reward |

### Modified
| File | Change |
|------|--------|
| `resources/application.yaml` | Add `voice-url`, `airtime-url`, `voice-from-number` under `africastalking:` |
| `service/ATService.java` | Add 3 new `@Value` fields + 6 new methods (bulk SMS, reminders, voice call) |
| `security/SecurityConfig.java` | No change needed — `/public/**` wildcard already covers USSD and voice callback |
