package com.softkit.wazi.controller;

import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.SubjectDto;
import com.softkit.wazi.model.TopicDto;
import com.softkit.wazi.service.SubjectService;
import com.softkit.wazi.service.TopicService;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/topic")
@RequiredArgsConstructor
public class TopicController {
    private final TopicService topicService;

    @PostMapping("")
    public ResponseEntity<?> createTopic(@Valid @RequestBody TopicDto topicDto) {
        return topicService.createTopic(topicDto);
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateTopic(@Valid @RequestBody TopicDto topicDto) {
        CustomResponse resp= topicService.updateTopic(topicDto);
        return ResponseUtils.createResponse(resp);
    }
}
