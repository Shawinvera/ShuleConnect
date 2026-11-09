package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.Lesson;
import com.softkit.wazi.entities.SubTopic;
import com.softkit.wazi.model.LessonDto;
import com.softkit.wazi.model.SubTopicDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface LessonMapper {
    @Mapping(source = "active", target = "active")
    Lesson toLessonEntity(LessonDto dto);
    @Mapping(source = "active", target = "active")
    LessonDto toLessonDto(Lesson entity);
}
