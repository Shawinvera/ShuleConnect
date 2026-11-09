package com.softkit.wazi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class WaziApplication {

    public static void main(String[] args) {
        SpringApplication.run(WaziApplication.class, args);
    }

}
