package com.softkit.wazi.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.context.ApplicationEvent;
import org.springframework.stereotype.Component;

@Getter
@Setter
public class CommunicationEvent extends ApplicationEvent {
    private String message;
    public CommunicationEvent(Object source, String message) {
        super(source);
        this.message = message;
    }
}
