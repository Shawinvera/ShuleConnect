import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http'; // Import this
import { TopicService } from './topic'; // 1. Changed Topic to TopicService

describe('TopicService', () => { // 2. Updated name
  let service: TopicService; // 3. Updated type

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()] // Add this for HttpClient support
    });
    service = TestBed.inject(TopicService); // 4. Updated injection
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
