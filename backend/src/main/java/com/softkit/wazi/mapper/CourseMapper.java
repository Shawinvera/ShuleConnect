package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.Course;
import com.softkit.wazi.model.CourseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface CourseMapper {
    @Mapping(source = "active", target = "active")
    @Mapping(source = "premium", target = "premium")
    Course toEntity(CourseDto dto);
    @Mapping(source = "active", target = "active")
    @Mapping(source = "premium", target = "premium")
    CourseDto toDto(Course entity);
}
