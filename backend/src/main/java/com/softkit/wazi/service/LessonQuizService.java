package com.softkit.wazi.service;

import com.softkit.wazi.entities.Lesson;
import com.softkit.wazi.entities.LessonQuiz;
import com.softkit.wazi.entities.LessonQuizAttempt;
import com.softkit.wazi.entities.LessonQuizQuestion;
import com.softkit.wazi.entities.Learner;
import com.softkit.wazi.model.LessonQuizCreateDto;
import com.softkit.wazi.model.LessonQuizLearnerDto;
import com.softkit.wazi.model.LessonQuizLessonOptionDto;
import com.softkit.wazi.model.LessonQuizResultDto;
import com.softkit.wazi.model.LessonQuizSubmissionDto;
import com.softkit.wazi.model.LessonQuizSummaryDto;
import com.softkit.wazi.repository.LearnerRepo;
import com.softkit.wazi.repository.LessonQuizAttemptRepo;
import com.softkit.wazi.repository.LessonQuizRepo;
import com.softkit.wazi.repository.LessonRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LessonQuizService {
    private static final int PASSING_PERCENTAGE = 70;

    private final LessonQuizRepo lessonQuizRepo;
    private final LessonQuizAttemptRepo attemptRepo;
    private final LessonRepo lessonRepo;
    private final LearnerRepo learnerRepo;

    @Transactional(readOnly = true)
    public List<LessonQuizSummaryDto> getQuizzes() {
        return lessonQuizRepo.findAllWithLesson().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LessonQuizLessonOptionDto> getLessonOptions() {
        return lessonRepo.findLessonQuizOptions();
    }

    @Transactional
    public LessonQuizSummaryDto createQuiz(LessonQuizCreateDto request) {
        if (request == null || isBlank(request.getLessonId())) {
            throw new IllegalArgumentException("Select a lesson for this quiz.");
        }
        if (isBlank(request.getTitle())) {
            throw new IllegalArgumentException("Enter a quiz title.");
        }
        if (request.getQuestions() == null || request.getQuestions().isEmpty()) {
            throw new IllegalArgumentException("Add at least one question.");
        }
        if (request.getQuestions().size() > 50) {
            throw new IllegalArgumentException("A quiz can contain no more than 50 questions.");
        }
        Lesson lesson = lessonRepo.findById(request.getLessonId())
                .orElseThrow(() -> new IllegalArgumentException("The selected lesson does not exist."));
        if (lessonQuizRepo.existsByLessonId(request.getLessonId())) {
            throw new IllegalStateException("A quiz already exists for this lesson.");
        }

        LessonQuiz quiz = LessonQuiz.builder()
                .title(request.getTitle().trim())
                .lesson(lesson)
                .build();

        List<LessonQuizQuestion> questions = new ArrayList<>();
        for (int i = 0; i < request.getQuestions().size(); i++) {
            LessonQuizCreateDto.Question question = request.getQuestions().get(i);
            if (question == null || isBlank(question.getPrompt())) {
                throw new IllegalArgumentException("Every question needs prompt text.");
            }
            if (question.getOptions() == null || question.getOptions().size() != 4
                    || question.getOptions().stream().anyMatch(this::isBlank)) {
                throw new IllegalArgumentException("Each question must have four non-empty choices.");
            }
            Integer correctOptionIndex = question.getCorrectOptionIndex();
            if (correctOptionIndex == null || correctOptionIndex < 0 || correctOptionIndex > 3) {
                throw new IllegalArgumentException("Choose the correct answer for every question.");
            }

            questions.add(LessonQuizQuestion.builder()
                    .prompt(question.getPrompt().trim())
                    .optionA(question.getOptions().get(0).trim())
                    .optionB(question.getOptions().get(1).trim())
                    .optionC(question.getOptions().get(2).trim())
                    .optionD(question.getOptions().get(3).trim())
                    .correctOptionIndex(correctOptionIndex)
                    .orderIndex(i)
                    .quiz(quiz)
                    .build());
        }
        quiz.setQuestions(questions);

        return toSummary(lessonQuizRepo.save(quiz));
    }

    @Transactional(readOnly = true)
    public LessonQuizLearnerDto getQuizForLesson(String lessonId, String learnerId) {
        LessonQuiz quiz = lessonQuizRepo.findForLesson(lessonId).orElse(null);
        if (quiz == null) {
            return null;
        }

        long attemptCount = 0;
        LessonQuizAttempt latestAttempt = null;
        if (!isBlank(learnerId)) {
            attemptCount = attemptRepo.countByQuizAndLearner(quiz.getId(), learnerId);
            latestAttempt = attemptRepo
                    .findFirstByQuiz_IdAndLearner_IdOrderBySubmittedAtDesc(quiz.getId(), learnerId)
                    .orElse(null);
        }

        List<LessonQuizLearnerDto.Question> questions = quiz.getQuestions().stream()
                .map(question -> new LessonQuizLearnerDto.Question(
                        question.getId(),
                        question.getPrompt(),
                        List.of(question.getOptionA(), question.getOptionB(), question.getOptionC(), question.getOptionD())
                ))
                .toList();

        return new LessonQuizLearnerDto(
                quiz.getId(),
                quiz.getTitle(),
                lessonId,
                questions,
                Math.toIntExact(attemptCount),
                latestAttempt == null ? null : latestAttempt.getScore(),
                latestAttempt == null ? null : latestAttempt.getPercentage()
        );
    }

    @Transactional
    public LessonQuizResultDto submit(String quizId, LessonQuizSubmissionDto request) {
        if (request == null || isBlank(request.getLearnerId())) {
            throw new IllegalArgumentException("Learner ID is required.");
        }
        if (request.getAnswers() == null) {
            throw new IllegalArgumentException("Submit an answer for every question.");
        }

        LessonQuiz quiz = lessonQuizRepo.findWithQuestions(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found."));
        Learner learner = learnerRepo.findById(request.getLearnerId())
                .orElseThrow(() -> new IllegalArgumentException("Learner not found."));

        List<LessonQuizQuestion> questions = quiz.getQuestions();
        if (request.getAnswers().size() != questions.size()) {
            throw new IllegalArgumentException("Submit an answer for every question.");
        }

        int score = 0;
        for (LessonQuizQuestion question : questions) {
            Integer answer = request.getAnswers().get(question.getId());
            if (answer == null || answer < 0 || answer > 3) {
                throw new IllegalArgumentException("Choose one answer for every question.");
            }
            if (answer.equals(question.getCorrectOptionIndex())) {
                score++;
            }
        }

        int questionCount = questions.size();
        int percentage = Math.round(score * 100.0f / questionCount);
        attemptRepo.save(LessonQuizAttempt.builder()
                .quiz(quiz)
                .learner(learner)
                .score(score)
                .questionCount(questionCount)
                .percentage(percentage)
                .build());

        long attemptCount = attemptRepo.countByQuizAndLearner(quizId, request.getLearnerId());
        return new LessonQuizResultDto(
                score,
                questionCount,
                percentage,
                percentage >= PASSING_PERCENTAGE,
                Math.toIntExact(attemptCount)
        );
    }

    @Transactional(readOnly = true)
    public boolean mayCompleteLesson(String lessonId, String learnerId) {
        LessonQuiz quiz = lessonQuizRepo.findForLesson(lessonId).orElse(null);
        return quiz == null || attemptRepo.countByQuizAndLearner(quiz.getId(), learnerId) > 0;
    }

    private LessonQuizSummaryDto toSummary(LessonQuiz quiz) {
        return new LessonQuizSummaryDto(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getLesson().getId(),
                quiz.getLesson().getName(),
                quiz.getQuestions().size()
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
