import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CloudinaryService } from '../../../services/cloudinary.service';
import { ToastService } from '../../services/toast.service';
import { CameraStateService } from '../../services/camera-state.service';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './photo-upload.html',
  styleUrl: './photo-upload.css',
})
export class PhotoUploadComponent implements OnDestroy {
  @Input() gender: 'MALE' | 'FEMALE' = 'MALE';
  @Input() currentPhotoUrl = '';
  @Input() isUploading = false;

  @Output() photoUploaded = new EventEmitter<string>();
  @Output() uploadingChange = new EventEmitter<boolean>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('cropCanvas') cropCanvas!: ElementRef<HTMLCanvasElement>;

  // Camera modal
  showCameraModal = false;
  cameraError = '';
  isCameraReady = false;
  facingMode: 'user' | 'environment' = 'user';
  private stream: MediaStream | null = null;

  // Crop modal
  showCropModal = false;
  rawImageSrc = '';
  cropImg: HTMLImageElement | null = null;
  croppedPreviewUrl = ''; // local preview shown immediately after crop

  // Crop state
  cropX = 0;
  cropY = 0;
  cropSize = 200;
  isDragging = false;
  isResizing = false;
  activeCorner: 'tl' | 'tr' | 'bl' | 'br' | null = null;
  dragStartX = 0;
  dragStartY = 0;
  dragStartCropX = 0;
  dragStartCropY = 0;
  resizeStartSize = 0;
  resizeStartCropX = 0;
  resizeStartCropY = 0;
  resizeStartX = 0;
  resizeStartY = 0;
  canvasWidth = 0;
  canvasHeight = 0;

  constructor(
    private cloudinaryService: CloudinaryService,
    public toast: ToastService,
    private ngZone: NgZone,
    private cameraStateService: CameraStateService,
  ) {}

  ngOnDestroy() {
    this.stopStream();
    this.cameraStateService.setCameraOpen(false); // Ensure camera state is reset on destroy
  }

  // ── File upload ──────────────────────────────────────────────────────────────

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.openCropFromFile(file);
  }

  // ── In-app camera ────────────────────────────────────────────────────────────

  async openCamera() {
    this.cameraError = '';
    this.isCameraReady = false;
    this.showCameraModal = true;
    this.cameraStateService.setCameraOpen(true); // Notify that camera is open
    await this.startStream();
  }

  private async startStream() {
    this.stopStream();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      // Wait one tick for *ngIf to render the video element
      setTimeout(() => {
        this.ngZone.run(() => {
          const video = this.videoEl?.nativeElement;
          if (video && this.stream) {
            video.srcObject = this.stream;
            video.onloadedmetadata = () => {
              video.play();
              this.isCameraReady = true;
            };
          }
        });
      }, 80);
    } catch (err: any) {
      this.ngZone.run(() => {
        if (err?.name === 'NotAllowedError') {
          if (Capacitor.isNativePlatform()) {
            this.cameraError = 'Camera permission denied.';
            this.showCameraModal = false;
            this.cameraStateService.setCameraOpen(false);
            NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails })
              .catch(() => {});
          } else {
            this.cameraError = 'Camera permission denied. Please allow camera access and try again.';
          }
        } else if (err?.name === 'NotFoundError') {
          this.cameraError = 'No camera found on this device.';
        } else {
          this.cameraError = 'Could not access camera. Please try uploading a photo instead.';
        }
      });
    }
  }

  async flipCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.isCameraReady = false;
    await this.startStream();
  }

  capturePhoto() {
    const video = this.videoEl?.nativeElement;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    this.closeCameraModal();
    this.rawImageSrc = canvas.toDataURL('image/jpeg', 1);
    this.showCropModal = true;
    setTimeout(() => this.initCropCanvas(), 100);
  }

  closeCameraModal() {
    this.stopStream();
    this.showCameraModal = false;
    this.isCameraReady = false;
    this.cameraError = '';
    this.cameraStateService.setCameraOpen(false); // Notify that camera is closed
  }

  private stopStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  // ── Crop ─────────────────────────────────────────────────────────────────────

  openCropFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.rawImageSrc = e.target?.result as string;
      this.showCropModal = true;
      setTimeout(() => this.initCropCanvas(), 100);
    };
    reader.readAsDataURL(file);
  }

  initCropCanvas() {
    const canvas = this.cropCanvas?.nativeElement;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      this.cropImg = img;
      const maxW = Math.min(window.innerWidth - 80, 500);
      const maxH = Math.min(window.innerHeight - 300, 400);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      this.canvasWidth = Math.round(img.width * scale);
      this.canvasHeight = Math.round(img.height * scale);
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;
      this.cropSize = Math.round(Math.min(this.canvasWidth, this.canvasHeight) * 0.7);
      this.cropX = Math.round((this.canvasWidth - this.cropSize) / 2);
      this.cropY = Math.round((this.canvasHeight - this.cropSize) / 2);
      this.drawCrop();
    };
    img.src = this.rawImageSrc;
  }

  drawCrop() {
    const canvas = this.cropCanvas?.nativeElement;
    if (!canvas || !this.cropImg) return;
    const ctx = canvas.getContext('2d')!;
    const { cropX: x, cropY: y, cropSize: s, canvasWidth: cw, canvasHeight: ch } = this;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(this.cropImg, 0, 0, cw, ch);

    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.clearRect(x, y, s, s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, s, s);
    ctx.clip();
    ctx.drawImage(this.cropImg, 0, 0, cw, ch);
    ctx.restore();

    // Square border
    ctx.strokeStyle = '#9333EA';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, s, s);

    // Rule-of-thirds grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + (s/3)*i, y); ctx.lineTo(x + (s/3)*i, y + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + (s/3)*i); ctx.lineTo(x + s, y + (s/3)*i); ctx.stroke();
    }

    // Corner bracket lines (white)
    const bl = 14;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    [
      [x, y, x+bl, y], [x, y, x, y+bl],
      [x+s, y, x+s-bl, y], [x+s, y, x+s, y+bl],
      [x, y+s, x+bl, y+s], [x, y+s, x, y+s-bl],
      [x+s, y+s, x+s-bl, y+s], [x+s, y+s, x+s, y+s-bl],
    ].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    // Resize handle squares at all 4 corners
    const hs = 10;
    ctx.fillStyle = '#9333EA';
    [
      [x - hs/2,     y - hs/2    ],  // top-left
      [x+s - hs/2,  y - hs/2    ],  // top-right
      [x - hs/2,     y+s - hs/2 ],  // bottom-left
      [x+s - hs/2,  y+s - hs/2 ],  // bottom-right
    ].forEach(([rx, ry]) => {
      ctx.fillRect(rx, ry, hs, hs);
    });
  }

  onCanvasMouseDown(e: MouseEvent) {
    this.handlePointerDown(...this.getCanvasPos(e.clientX, e.clientY));
  }
  onCanvasTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.handlePointerDown(...this.getCanvasPos(e.touches[0].clientX, e.touches[0].clientY));
  }

  private handlePointerDown(x: number, y: number) {
    const { cropX: cx, cropY: cy, cropSize: s } = this;
    const hit = 18; // hit area radius around each corner

    // Check all 4 corners
    const cornerHit = (
      (Math.abs(x - cx)   <= hit && Math.abs(y - cy)   <= hit) ? 'tl' :
      (Math.abs(x - cx-s) <= hit && Math.abs(y - cy)   <= hit) ? 'tr' :
      (Math.abs(x - cx)   <= hit && Math.abs(y - cy-s) <= hit) ? 'bl' :
      (Math.abs(x - cx-s) <= hit && Math.abs(y - cy-s) <= hit) ? 'br' :
      null
    ) as 'tl'|'tr'|'bl'|'br'|null;

    if (cornerHit) {
      this.isResizing = true;
      this.activeCorner = cornerHit;
      this.resizeStartX = x;
      this.resizeStartY = y;
      this.resizeStartSize = s;
      this.resizeStartCropX = cx;
      this.resizeStartCropY = cy;
    } else if (x >= cx && x <= cx+s && y >= cy && y <= cy+s) {
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      this.dragStartCropX = cx;
      this.dragStartCropY = cy;
    }
  }

  onCanvasMouseMove(e: MouseEvent) {
    this.handlePointerMove(...this.getCanvasPos(e.clientX, e.clientY));
  }
  onCanvasTouchMove(e: TouchEvent) {
    e.preventDefault();
    this.handlePointerMove(...this.getCanvasPos(e.touches[0].clientX, e.touches[0].clientY));
  }

  private handlePointerMove(x: number, y: number) {
    if (this.isDragging) {
      this.cropX = Math.max(0, Math.min(this.canvasWidth  - this.cropSize, this.dragStartCropX + x - this.dragStartX));
      this.cropY = Math.max(0, Math.min(this.canvasHeight - this.cropSize, this.dragStartCropY + y - this.dragStartY));
      this.drawCrop();
    } else if (this.isResizing && this.activeCorner) {
      const dx = x - this.resizeStartX;
      const dy = y - this.resizeStartY;
      const minSize = 60;

      switch (this.activeCorner) {
        case 'br': {
          const newS = Math.max(minSize, Math.min(
            this.canvasWidth  - this.resizeStartCropX,
            this.canvasHeight - this.resizeStartCropY,
            this.resizeStartSize + (dx + dy) / 2,
          ));
          this.cropSize = Math.round(newS);
          break;
        }
        case 'bl': {
          const newS = Math.max(minSize, Math.min(
            this.resizeStartCropX + this.resizeStartSize,
            this.canvasHeight - this.resizeStartCropY,
            this.resizeStartSize + (-dx + dy) / 2,
          ));
          this.cropSize = Math.round(newS);
          this.cropX = Math.max(0, this.resizeStartCropX + this.resizeStartSize - this.cropSize);
          break;
        }
        case 'tr': {
          const newS = Math.max(minSize, Math.min(
            this.canvasWidth  - this.resizeStartCropX,
            this.resizeStartCropY + this.resizeStartSize,
            this.resizeStartSize + (dx - dy) / 2,
          ));
          this.cropSize = Math.round(newS);
          this.cropY = Math.max(0, this.resizeStartCropY + this.resizeStartSize - this.cropSize);
          break;
        }
        case 'tl': {
          const newS = Math.max(minSize, Math.min(
            this.resizeStartCropX + this.resizeStartSize,
            this.resizeStartCropY + this.resizeStartSize,
            this.resizeStartSize + (-dx - dy) / 2,
          ));
          this.cropSize = Math.round(newS);
          this.cropX = Math.max(0, this.resizeStartCropX + this.resizeStartSize - this.cropSize);
          this.cropY = Math.max(0, this.resizeStartCropY + this.resizeStartSize - this.cropSize);
          break;
        }
      }
      this.drawCrop();
    }
  }

  onPointerUp() {
    this.isDragging = false;
    this.isResizing = false;
    this.activeCorner = null;
  }

  private getCanvasPos(clientX: number, clientY: number): [number, number] {
    const canvas = this.cropCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return [
      (clientX - rect.left) * (this.canvasWidth / rect.width),
      (clientY - rect.top) * (this.canvasHeight / rect.height),
    ];
  }

  closeCropModal() {
    this.showCropModal = false;
    this.rawImageSrc = '';
    this.cropImg = null;
  }

  async confirmCrop() {
    if (!this.cropImg) return;
    const scaleX = this.cropImg.width / this.canvasWidth;
    const scaleY = this.cropImg.height / this.canvasHeight;
    const out = document.createElement('canvas');
    const sw = this.cropSize * scaleX;
    const sh = this.cropSize * scaleY;
    out.width = sw;
    out.height = sh;
    out.getContext('2d')!.drawImage(
      this.cropImg,
      this.cropX * scaleX,
      this.cropY * scaleY,
      sw,
      sh,
      0,
      0,
      sw,
      sh,
    );
    out.toBlob(
      async (blob) => {
        if (!blob) return;
        this.ngZone.run(async () => {
          this.croppedPreviewUrl = URL.createObjectURL(blob!);
          this.closeCropModal();
          await this.uploadPhoto(new File([blob!], 'profile.jpg', { type: 'image/jpeg' }));
        });
      },
      'image/jpeg',
      1,
    );
  }

  clearPhoto() {
    this.croppedPreviewUrl = '';
    this.photoUploaded.emit('');
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  private async uploadPhoto(file: File) {
    this.uploadingChange.emit(true);
    try {
      const compressed = await this.cloudinaryService.compressImage(file);
      this.cloudinaryService.uploadImage(compressed).subscribe({
        next: (url) => {
          this.uploadingChange.emit(false);
          this.photoUploaded.emit(url);
        },
        error: () => {
          this.uploadingChange.emit(false);
          this.toast.show('Failed to upload photo. Please try again.', 'error');
        },
      });
    } catch {
      this.uploadingChange.emit(false);
      this.toast.show('Failed to process photo. Please try again.', 'error');
    }
  }
}
