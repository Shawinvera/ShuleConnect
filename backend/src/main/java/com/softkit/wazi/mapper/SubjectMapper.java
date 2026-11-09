package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.Grade;
import com.softkit.wazi.entities.Subject;
import com.softkit.wazi.model.GradeDto;
import com.softkit.wazi.model.SubjectDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface SubjectMapper {
    @Mapping(source = "active", target = "active")
    Subject toSubjectEntity(SubjectDto dto);
    @Mapping(source = "active", target = "active")
    SubjectDto toSubjectDto(Subject entity);
}
