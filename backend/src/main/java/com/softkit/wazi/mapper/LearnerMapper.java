package com.softkit.wazi.mapper;

import com.softkit.wazi.entities.Learner;
import com.softkit.wazi.model.LearnerDto;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        unmappedSourcePolicy = ReportingPolicy.IGNORE
)
public interface LearnerMapper {
    Learner toLearnerEntity(LearnerDto dto);
    LearnerDto toLearnerDto(Learner learner);
}
