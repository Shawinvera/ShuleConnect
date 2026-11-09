import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment'; 

export interface PaymentResponse {
  successful: boolean;
  errorMessage: string | null;
  data: string; // This will be the checkoutRequestID or status string
}

@Injectable({ providedIn: 'root' })
export class MPesaPaymentService {
  private readonly endpoint = `${environment.apiUrl}/payment/safaricom`;

  constructor(private http: HttpClient) {}

  public triggerPayment(payload: any): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.endpoint}/trigger`, payload);
  }

  public queryStatus(checkoutRequestID: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.endpoint}/query?checkoutRequestID=${checkoutRequestID}`);
  }
}