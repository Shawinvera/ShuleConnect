package com.softkit.wazi.model;

public interface TopicSummaryDto {
    String getId();
    String getName();
    String getDescription();
    Boolean getActive();
    Long getSubTopicCount();
    Integer getOrderIndex();
}
