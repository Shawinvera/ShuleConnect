package com.softkit.wazi.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
public class HtmlTemplateUtils {
    public static String loadHtmlTemplate(String templatePath) {
        String html = "";
        try (InputStream inputStream = new ClassPathResource(templatePath).getInputStream()) {
            return IOUtils.toString(inputStream, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Error loading template {} with errors {}", templatePath,e.getMessage());
            return html;
        }
    }
}
