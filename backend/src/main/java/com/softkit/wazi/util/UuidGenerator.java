package com.softkit.wazi.util;

import java.util.UUID;

public class UuidGenerator {
        public static String generateEntityUuid(String prefix) {
            return prefix + "-" + UUID.randomUUID();
        }
}
