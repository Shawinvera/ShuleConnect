package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.Grade;
import com.softkit.wazi.model.GradeDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface GradeMapper {
    @Mapping(source = "active", target = "active")
    Grade toGradeEntity(GradeDto dto);
    @Mapping(source = "active", target = "active")
    GradeDto toGradeDto(Grade entity);
}
