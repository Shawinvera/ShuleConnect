import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

@Component({
  selector: 'app-custom-video-player',
  standalone: true,
  imports: [CommonModule, MatIcon],
  templateUrl: './custom-video-player.component.html',
  styleUrls: ['./custom-video-player.component.css']
})
export class CustomVideoPlayerComponent implements OnInit, OnDestroy {
  @Input() videoId!: string;
  @Input() autoplay = true;
  @Output() onReady = new EventEmitter<void>();
  @Output() onStateChange = new EventEmitter<number>();

  @ViewChild('playerContainer', { static: true }) playerContainer!: ElementRef;
  @ViewChild('videoPlayer', { static: true }) videoPlayer!: ElementRef;

  private player: any;
  private controlsTimeout: any;
  private overlayTimeout: any;
  private mouseTimeout: any;
  private seekTimeout: any;

  isPlaying = false;
  isPaused = false;
  hasEnded = false;
  showControls = false;
  isFullscreen = false;
  showTemporaryOverlays = true; // Start with overlay visible
  isWaitingForSeekPlay = false; // Track if we're waiting for video to resume after seek
  lastMouseY = 0; // Track mouse position for bottom-to-top detection
  progress = 0;
  currentTime = 0;
  duration = 0;
  currentVolume: number = 50;
  isMuted: boolean = false;


  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadYouTubeAPI();
    // Add keyboard event listener
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    // Add fullscreen change listener
    document.addEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
  }

  ngOnDestroy() {
    if (this.player) {
      this.player.destroy();
    }
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    if (this.overlayTimeout) {
      clearTimeout(this.overlayTimeout);
    }
    if (this.mouseTimeout) {
      clearTimeout(this.mouseTimeout);
    }
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
    }
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    // Remove fullscreen change listener
    document.removeEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
  }

  private loadYouTubeAPI() {
    if (window.YT) {
      this.initializePlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      this.initializePlayer();
    };

    if (!document.querySelector('script[src*="youtube"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  }

  private initializePlayer() {
    this.player = new window.YT.Player(this.playerContainer.nativeElement, {
      videoId: this.videoId,
      playerVars: {
        // Completely disable all YouTube controls and UI elements
        controls: 0,           // Hide all controls
        disablekb: 1,         // Disable keyboard controls
        fs: 0,                // Disable fullscreen button
        iv_load_policy: 3,    // Hide video annotations
        modestbranding: 1,    // Hide YouTube logo
        rel: 0,               // Don't show related videos
        showinfo: 0,          // Hide video title and uploader info
        autoplay: this.autoplay ? 1 : 0,
        playsinline: 1,       // Play inline on mobile
        cc_load_policy: 0,    // Don't show captions by default
        origin: window.location.origin,
        enablejsapi: 1,
        // Additional parameters to minimize YouTube UI
        autohide: 1,          // Auto-hide controls
        color: 'white',       // Use white progress bar
        hl: 'en',            // Set language
        loop: 0,             // Don't loop
        playlist: this.videoId, // Required for loop parameter
        start: 0,            // Start from beginning
        widget_referrer: window.location.origin
      },
      events: {
        onReady: (event: any) => {
          this.duration = this.player.getDuration();
          this.player.setVolume(this.currentVolume);
          this.onReady.emit();
          this.startProgressTracking();

          // Overlay is already visible from start, no need to show it here
          // It will be hidden 2.5 seconds after video starts playing
        },
        onStateChange: (event: any) => {
          const state = event.data;

          this.isPlaying = state === window.YT.PlayerState.PLAYING;
          this.isPaused = state === window.YT.PlayerState.PAUSED;
          this.hasEnded = state === window.YT.PlayerState.ENDED;

          if (this.hasEnded) {
            this.progress = 100;
            this.currentTime = this.duration;
          }

          // Handle overlay timing when video starts playing
          if (this.isPlaying) {
            this.handleVideoStartPlaying();
          }

          // When video is paused, always show the bottom overlay
          if (this.isPaused) {
            this.showTemporaryOverlays = true;
            // Clear any existing timeouts when paused
            if (this.overlayTimeout) {
              clearTimeout(this.overlayTimeout);
            }
          }

          // Force change detection immediately
          this.cdr.detectChanges();

          this.onStateChange.emit(state);
        }
      }
    });
  }

  private startProgressTracking() {
    setInterval(() => {
      if (this.player) {
        if (this.isPlaying) {
          this.currentTime = this.player.getCurrentTime();
          this.progress = (this.currentTime / this.duration) * 100;
        }
        // Force change detection for progress updates
        this.cdr.detectChanges();
      }
    }, 500);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePlayPause();
    }
  }

  // Add these methods
setVolume(event: any) {
  const volume = event.target.value;
  this.currentVolume = volume;
  if (this.player) {
    this.player.setVolume(this.currentVolume);
    if (this.currentVolume > 0) this.isMuted = false;
  }
}

toggleMute() {
  if (this.isMuted) {
    this.player.unMute();
    this.player.setVolume(this.currentVolume || 50);
    this.isMuted = false;
  } else {
    this.player.mute();
    this.isMuted = true;
  }
}

  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
    this.cdr.detectChanges();
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.player.pauseVideo();
    } else {
      this.player.playVideo();
      // Show overlay for 3 seconds when play is pressed, then hide after 3 seconds of playing
      this.showOverlayFor3SecondsAfterPlay();
    }
  }

  play() {
    this.player.playVideo();
  }

  replay() {
    this.player.seekTo(0);
    this.player.playVideo();
  }

  seekTo(event: MouseEvent) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * this.duration;
    this.player.seekTo(seekTime);

    // Show overlay and wait for video to resume playing
    this.showTemporaryOverlays = true;
    this.isWaitingForSeekPlay = true;

    // Clear any existing timeouts
    if (this.overlayTimeout) {
      clearTimeout(this.overlayTimeout);
    }
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
    }

    this.cdr.detectChanges();
  }

  toggleFullscreen() {
    const element = this.videoPlayer.nativeElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  showControlsTemporarily() {
    this.showControls = true;
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    this.controlsTimeout = setTimeout(() => {
      if (this.isPlaying && !this.isPaused) {
       this.showControls = false;
    }
    this.cdr.detectChanges();
  }, 4000); 
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Handle video start playing (initial or after seek)
  private handleVideoStartPlaying() {
    if (this.isWaitingForSeekPlay) {
      // Video resumed after seeking, start 3 second countdown
      this.isWaitingForSeekPlay = false;
      this.hideOverlayAfter3Seconds();
    } else if (this.showTemporaryOverlays) {
      // Video started playing normally, hide overlay after 3 seconds
      this.hideOverlayAfter3Seconds();
    }
  }

  private hideOverlayAfter3Seconds() {
    // Clear any existing timeout
    if (this.overlayTimeout) {
      clearTimeout(this.overlayTimeout);
    }

    // Hide overlay after 5 seconds
    this.overlayTimeout = setTimeout(() => {
      this.showTemporaryOverlays = false;
      this.cdr.detectChanges();
    }, 5000);
  }

  private showOverlayFor2Point5Seconds() {
    this.showTemporaryOverlays = true;

    // Clear any existing timeout
    if (this.mouseTimeout) {
      clearTimeout(this.mouseTimeout);
    }

    // Hide overlay after 5 seconds
    this.mouseTimeout = setTimeout(() => {
      this.showTemporaryOverlays = false;
      this.cdr.detectChanges();
    }, 5000);

    this.cdr.detectChanges();
  }

  // Simple overlay control methods
  private showOverlayFor3SecondsAfterPlay() {
    this.showTemporaryOverlays = true;

    // Clear any existing timeout
    if (this.overlayTimeout) {
      clearTimeout(this.overlayTimeout);
    }

    // Hide overlay after 5 seconds
    this.overlayTimeout = setTimeout(() => {
      this.showTemporaryOverlays = false;
      this.cdr.detectChanges();
    }, 5000);

    this.cdr.detectChanges();
  }

  onMouseEnter() {
    // Just track that mouse entered, don't show overlay yet
    // Overlay will show on bottom-to-top movement
  }

  onMouseMove(event: MouseEvent) {
    const currentY = event.clientY;

    // Detect bottom-to-top movement (mouse moving up)
    if (this.lastMouseY > 0 && currentY < this.lastMouseY) {
      // Mouse is moving upward, show overlay for 2.5 seconds
      this.showOverlayFor2Point5Seconds();
    }

    this.lastMouseY = currentY;
  }

  onMouseLeave() {
    // Reset mouse tracking when leaving video area
    this.lastMouseY = 0;
    // Don't hide overlay here - let timers handle it
  }
}