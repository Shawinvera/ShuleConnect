package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.Subject;
import com.softkit.wazi.entities.Topic;
import com.softkit.wazi.model.SubjectDto;
import com.softkit.wazi.model.TopicDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface TopicMapper {
    @Mapping(source = "active", target = "active")
    Topic toTopicEntity(TopicDto dto);
}
