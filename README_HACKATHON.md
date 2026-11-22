# ShuleConnect - EdTech Solution for Africa's Talking Hackathon

## 🎯 Project Overview

**ShuleConnect** is a comprehensive EdTech platform that leverages Africa's Talking APIs to make education accessible via basic mobile phones across Africa. The platform supports SMS, USSD, Voice, and Airtime APIs to deliver lessons, manage enrollment, reward learners, and keep parents/teachers coordinated.

---

## 🚀 Key Features & AT API Integration

### 1. **Learner Registration & Enrollment** (USSD API)
**Endpoint:** Dial `*384*3844957#` (ShuleConnect USSD code)

**Flow:**
- Main menu appears with options: Register, Enrol, Take Quiz, Check Results
- Parents/learners register directly from their phone
- Confirmation SMS sent automatically

**Code Location:** `USSDService.java` → `processUssd()` method
- Handles multi-level USSD menu navigation
- Parses user input separated by `*`
- Stores quiz responses in database

**Example:**
```
CON Welcome to ShuleConnect
1. Register
2. Enrol in course
3. Take Quiz
4. Check results
```

---

### 2. **Lessons, Reminders & Schedule Updates** (SMS API)
**How it works:**
- Daily lesson summaries sent via SMS
- Assignment deadline reminders
- Exam date alerts
- Timetable change notifications

**Code Location:** `ATService.java`
- `sendDailyLesson(phone, title, summary)` - Sends lesson content
- `sendAssignmentReminder(phone, title, deadline)` - Assignment alerts
- `sendExamReminder(phone, examName, date)` - Exam notifications
- `sendTimetableChange(phone, subject, oldTime, newTime)` - Schedule updates
- `sendBulkSms(phones[], message)` - Bulk notifications for whole classes

**AT API Endpoint:** `https://api.sandbox.africastalking.com/version1/messaging`

**Request Format:**
```http
POST /version1/messaging
Header: apiKey: <your-at-api-key>
Body (form-data):
  username: sandbox
  to: +254711XXXXX
  message: Daily Lesson: Mathematics - Algebra basics...
```

---

### 3. **Parent & School Announcements** (Voice API)
**How it works:**
- Priority announcements via voice call (school closures, urgent meetings)
- Text-to-Speech (TTS) in multiple languages
- Broadcast to multiple parents simultaneously

**Code Location:** 
- `ATService.java` → `makeVoiceCall()`, `makeVoiceBroadcast()`
- `VoiceController.java` → `/public/at/voice/callback` returns voice XML

**Voice Callback (TwiML-like XML):**
```xml
<Response>
  <Say>Welcome to ShuleConnect. School will be closed tomorrow due to weather. Thank you.</Say>
</Response>
```

**AT API Endpoint:** `https://voice.africastalking.com/call`

**Request:**
```http
POST /call
Header: apiKey: <your-at-api-key>
Body (form-data):
  username: sandbox
  from: +254711082000
  to: +254705XXXXXX
```

When AT receives the call request, it calls your `/public/at/voice/callback` endpoint to get the voice instructions.

---

### 4. **Learning Rewards** (Airtime API)
**How it works:**
- Reward students with airtime for:
  - Attendance (5 KES)
  - Quiz completion - score based (5-10 KES)
  - Course completion (20 KES)

**Code Location:** 
- `AirtimeService.java`:
  - `rewardAttendance(phone)` - 5 KES for showing up
  - `rewardQuizCompletion(phone, score)` - Score-based reward
  - `rewardCourseCompletion(phone)` - 20 KES for finishing
  - `rewardBulkAirtime(recipients[])` - Bulk rewards

**Endpoint:** `POST /api/airtime/reward`

**Request Body:**
```json
{
  "phoneNumber": "+254705145256",
  "type": "QUIZ",
  "score": 85
}
```

**AT API Endpoint:** `https://api.sandbox.africastalking.com/version1/airtime/send`

**Request:**
```http
POST /version1/airtime/send
Header: apiKey: <your-at-api-key>
Body (form-data):
  username: sandbox
  recipients: [{"phoneNumber":"+254711XXXXX","currencyCode":"KES","amount":"10"}]
```

---

### 5. **Quizzes & Live Feedback** (USSD API)
**How it works:**
- Run quick quizzes via USSD (no app needed)
- Students dial in, answer questions interactively
- Responses stored in database instantly

**Code Location:** `USSDService.java`
- Quiz flow: `3*<quizCode>*<answer>*0`
- Saves to `QuizResponse` entity
- Real-time feedback

**Example Flow:**
```
User: *384*3844957#
System: CON Welcome to ShuleConnect
        1. Register
        2. Enrol in course
        3. Take Quiz
        4. Check results
User: 3
System: CON Enter quiz code:
User: MATH101
System: CON Quiz MATH101 loaded. Enter your answer:
User: 42
System: CON Answer recorded. Enter next question code or 0 to finish:
User: 0
System: END Quiz completed! Thank you for participating.
```

---

### 6. **Teacher & School Coordination** (SMS API)
**How it works:**
- Staff notifications for meetings, schedule changes
- Teacher assignment updates
- Admin announcements

**Code Location:** `ATService.java` → `notifyTeacher(phone, message)`

**Usage Example:**
```java
atService.notifyTeacher("+254711XXXXX", 
  "Staff meeting tomorrow at 10 AM. Attendance mandatory.");
```

---

## 🛠️ Technical Architecture

### Backend
- **Framework:** Spring Boot 4.0.2 (Java 17)
- **Database:** MySQL 8.0
- **APIs:** REST + Africa's Talking integration
- **Async Processing:** `@Async` for non-blocking AT API calls

### Frontend
- **Framework:** Angular 20 + Ionic/Capacitor
- **UI:** Tailwind CSS + Material Design
- **Theme:** Dark green branding

### Database Schema
**Key Tables:**
- `users` - Parents/Teachers/Admins
- `learners` - Student profiles
- `lessons` - Course content
- `quiz_responses` - USSD quiz answers
- `grades`, `subjects`, `topics`, `sub_topics`

---

## 🐳 Docker Deployment

### Prerequisites
- Docker Desktop installed
- Ports 3307, 4200, 8112 available

### Quick Start
```bash
# Clone the repo
git clone <your-repo-url>
cd ShuleConnect

# Start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:4200
# Backend API: http://localhost:8112/api
# MySQL: localhost:3307
```

### Docker Services
1. **MySQL** - Database on port 3307
2. **Backend** - Spring Boot API on port 8112
3. **Frontend** - Angular dev server on port 4200

### Environment Variables (already configured in docker-compose.yml)
- `AT_USERNAME=sandbox`
- `AT_API_KEY=atsk_...`
- `DB_URL=jdbc:mysql://mysql:3306/shuleconnect`
- All configs loaded automatically

---

## 📡 Africa's Talking API Configuration

### Current Setup (Sandbox Mode)
```yaml
africastalking:
  username: sandbox
  api-key: atsk_28ca8560495db350fbfb50dbb26d3ba612e17b38543fc39da75b377fb806eaa555f3be49
  api-url: https://api.sandbox.africastalking.com/version1/messaging
  ussd-service-code: *384*3844957#
  voice-url: https://voice.africastalking.com/call
  voice-callback-url: https://api.shuleconnect.com/api/public/at/voice/callback
  caller-id: +254711082000
  airtime-url: https://api.sandbox.africastalking.com/version1/airtime/send
```

### Testing in Sandbox
1. **SMS:** Use the [AT Sandbox Simulator](https://account.africastalking.com/apps/sandbox/test/sms)
2. **USSD:** Use the USSD Simulator in your AT dashboard
3. **Voice:** Use the Voice Simulator
4. **Airtime:** Sandbox returns success but no real airtime sent

### Going to Production
1. Upgrade to [Production Account](https://account.africastalking.com/)
2. Update `AT_USERNAME` from `sandbox` to your live username
3. Get production API key
4. Buy a dedicated short code for USSD
5. Apply for Airtime service activation

---

## 🎥 Demo Flow for Hackathon

### 1. USSD Registration
```bash
# Show USSD menu navigation
Dial *384*123# → Select 1 (Register) → Enter phone → Receive SMS confirmation
```

### 2. SMS Lesson Delivery
```bash
# Trigger from admin panel or API call
POST /api/lesson/send-daily
Response: SMS sent to all enrolled learners
```

### 3. Voice Announcement
```bash
# Broadcast to parents
POST /api/voice/broadcast
Body: {"phoneNumbers": ["+254..."], "message": "School closed tomorrow"}
Response: Calls initiated
```

### 4. Airtime Reward
```bash
# Reward student for quiz
POST /api/airtime/reward
Body: {"phoneNumber": "+254...", "type": "QUIZ", "score": 90}
Response: 10 KES airtime sent
```

### 5. USSD Quiz
```bash
# Student takes quiz via USSD
*384*3844957# → 3 → MATH101 → 42 → 0
Quiz responses saved in database
```

---

## 🏆 Hackathon Submission Checklist

✅ **Use of AT APIs:** All 4 APIs integrated (SMS, USSD, Voice, Airtime)
✅ **Innovation:** USSD-based enrollment + learning rewards system
✅ **User Experience:** Works on any phone, no smartphone needed
✅ **Functionality:** Full EdTech platform with error handling
✅ **Presentation:** Docker deployment + clear demo flow

---

## 📊 Key Metrics

- **Phone Access:** 100% (works on basic phones via USSD/SMS)
- **APIs Used:** 4/4 (SMS, USSD, Voice, Airtime)
- **Deployment:** Dockerized (portable, CI/CD ready)
- **Target Market:** Kenya, Uganda, Tanzania, Ghana (Africa's Talking coverage)

---

## 🔗 Useful Links

- [Africa's Talking Docs](https://developers.africastalking.com/)
- [USSD API Guide](https://developers.africastalking.com/docs/ussd/overview)
- [SMS API Guide](https://developers.africastalking.com/docs/sms/overview)
- [Voice API Guide](https://developers.africastalking.com/docs/voice/overview)
- [Airtime API Guide](https://developers.africastalking.com/docs/airtime/overview)

---

## 👥 Team / Contact

**Developer:** Shawin Vera  
**Email:** opadeshawinvera@gmail.com  
**Project:** ShuleConnect  
**Hackathon:** Africa's Talking EdTech Solutions  

---

## 🎬 Presentation Script (5 min)

**[0:00-0:30] Problem:**
> "In Kenya, only 30% have smartphones, but 95% have basic phones. How do we deliver education to everyone?"

**[0:30-1:30] Solution - ShuleConnect:**
> "Our platform uses USSD for enrollment, SMS for lessons, Voice for urgent announcements, and Airtime to reward learners - all via basic phones."

**[1:30-3:00] Live Demo:**
1. USSD registration: `*384*3844957#`
2. Show SMS lesson received
3. Trigger voice broadcast
4. Award airtime for quiz completion

**[3:00-4:00] Technical:**
> "Spring Boot backend, Angular frontend, MySQL database, all Dockerized. 4 AT APIs integrated with async processing."

**[4:00-4:30] Impact:**
> "Students earn airtime for learning. Parents stay informed without data costs. Teachers coordinate via SMS. Education becomes accessible."

**[4:30-5:00] Q&A**

---

**Ready to deploy and demo! 🚀**
