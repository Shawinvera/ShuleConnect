package com.softkit.wazi.util;

import com.softkit.wazi.model.ThreadData;

public class RequestContext {
    private static final ThreadLocal<ThreadData> threadLocal = new ThreadLocal<>();

    public static void setThreadData(ThreadData threadData) {
        threadLocal.set(threadData);
    }

    public static ThreadData getThreadData() {
        return threadLocal.get();
    }

    public static void clear() {
        threadLocal.remove();
    }
}
