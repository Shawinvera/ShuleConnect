package com.softkit.wazi.controller;

import com.softkit.wazi.model.CustomResponse;
import com.softkit.wazi.model.SubTopicDto;
import com.softkit.wazi.model.SubTopicSummaryDto;
import com.softkit.wazi.service.SubTopicService;
import com.softkit.wazi.util.ResponseUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sub-topic")
@RequiredArgsConstructor
public class SubTopicController {
    private final SubTopicService subTopicService;

    @PostMapping("")
    public ResponseEntity<?> createSubTopic(@Valid  @RequestBody SubTopicDto subTopicDto) {
        return subTopicService.createSubTopic(subTopicDto);
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateSubTopic(@Valid  @RequestBody SubTopicDto subTopicDto) {
        CustomResponse rep = subTopicService.updateSubTopic(subTopicDto);
        return ResponseUtils.createResponse(rep);
    }

    @GetMapping("/fetch/byTopicId/{topicId}")
    public ResponseEntity<List<SubTopicSummaryDto>> getSubTopicSummary(@PathVariable String topicId) {
        return subTopicService.getSubTopicsByTopicId(topicId);
    }
}
