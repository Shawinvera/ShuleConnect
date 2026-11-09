import { Component, OnInit, Output, EventEmitter, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountryCodeService } from '../../services/country-code.service';
import { CountryCode } from '../../data/country-codes';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.html',
  host: { class: 'block w-full' }
})
export class PhoneInputComponent implements OnInit {
  @Input() placeholder = '712 345 678';
  @Input() initialPhone = '';
  @Output() phoneChange = new EventEmitter<string>();
  @Output() validityChange = new EventEmitter<boolean>();
  @ViewChild('phoneInput') phoneInputRef!: ElementRef<HTMLInputElement>;

  countries: CountryCode[] = [];
  filtered: CountryCode[] = [];
  selected: CountryCode = { name: 'Kenya', code: '+254', iso: 'KE' };
  phoneNumber = '';
  isOpen = false;
  search = '';
  isLoading = true;
  phoneError = '';

  constructor(
    private countryService: CountryCodeService,
    private elRef: ElementRef
  ) {}

  ngOnInit() {
    this.countryService.getCodes().subscribe(codes => {
      this.countries = codes;
      this.filtered = codes;
      const ke = codes.find(c => c.iso === 'KE');
      if (ke) this.selected = ke;
      this.isLoading = false;
      if (this.initialPhone) {
        this.parseInitialPhone(codes);
      }
    });
  }

  private parseInitialPhone(codes: CountryCode[]) {
    const sorted = [...codes].sort((a, b) => b.code.length - a.code.length);
    const match = sorted.find(c => this.initialPhone.startsWith(c.code));
    if (match) {
      this.selected = match;
      this.phoneNumber = this.initialPhone.slice(match.code.length);
    } else {
      this.phoneNumber = this.initialPhone.replace(/^\+?\d{1,4}/, '');
    }
    this.validityChange.emit(this.phoneNumber.length >= 9 && this.phoneNumber.length <= 10);
  }

  // Use native input event to strip non-digits immediately
  onNativeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '');
    const capped = digitsOnly.slice(0, 10);
    input.value = capped;
    this.phoneNumber = capped;
    this.phoneError = '';
    this.validityChange.emit(this.phoneNumber.length >= 9 && this.phoneNumber.length <= 10);
    this.emit();
  }

  onBlur() {
    const digits = this.phoneNumber;
    if (digits.length === 0) {
      this.phoneError = '';
      return;
    }
    if (digits.length < 9 || digits.length > 10) {
      this.phoneError = 'Enter 9 or 10 digits';
      return;
    }
    this.phoneError = '';
    this.emit();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.search = '';
      this.filtered = this.countries;
    }
  }

  onSearch() {
    const q = this.search.toLowerCase();
    this.filtered = this.countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.includes(q) || c.iso.toLowerCase().includes(q)
    );
  }

  selectCountry(c: CountryCode) {
    this.selected = c;
    this.isOpen = false;
    this.emit();
  }

  private emit() {
    const digits = this.phoneNumber;
    if (digits.length < 9) return; // don't emit incomplete numbers
    const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
    this.phoneChange.emit(this.selected.code + normalized);
  }

  get isValid(): boolean {
    return this.phoneNumber.length >= 9 && this.phoneNumber.length <= 10;
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(e: Event) {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.isOpen = false;
    }
  }
}
