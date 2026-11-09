package com.softkit.wazi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LessonDto extends BaseDto {
    private String name;
    private String content;
    private String videoUrl;
    private Boolean active;
    private String subTopicId;
    private Integer orderIndex;
    private Double duration;
    private Boolean trailer;
    private Long points;
    private Boolean learnerCompleted;
}
