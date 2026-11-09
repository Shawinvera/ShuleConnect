package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.AppUser;
import com.softkit.wazi.entities.Course;
import com.softkit.wazi.model.AppUserDto;
import com.softkit.wazi.model.CourseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface AppUserMapper {
    AppUser toEntity(AppUserDto dto);
    AppUserDto toDto(AppUser entity);
}
