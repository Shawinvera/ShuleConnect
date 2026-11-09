package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.SubTopic;
import com.softkit.wazi.entities.Topic;
import com.softkit.wazi.model.SubTopicDto;
import com.softkit.wazi.model.TopicDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface SubTopicMapper {
    @Mapping(source = "active", target = "active")
    SubTopic toSubTopicEntity(SubTopicDto dto);
}
