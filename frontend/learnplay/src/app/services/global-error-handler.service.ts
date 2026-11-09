import { ErrorHandler, Injectable } from '@angular/core';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private analyticsService: AnalyticsService) {}

  handleError(error: any): void {
    // Log to console for development
    console.error('Global error caught:', error);

    // Extract meaningful error information
    const errorInfo = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    };

    // Track the error
    this.analyticsService.trackError('unhandled_error', errorInfo.message, {
      error_name: errorInfo.name,
      error_stack: errorInfo.stack?.substring(0, 1000), // Limit stack trace length
      page_url: errorInfo.url,
      user_agent: errorInfo.user_agent
    });

    // Re-throw the error so it still appears in console and doesn't break error handling
    throw error;
  }
}