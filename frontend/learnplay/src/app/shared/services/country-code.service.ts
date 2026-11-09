import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, catchError, of, timeout } from 'rxjs';
import { COUNTRY_CODES, CountryCode } from '../data/country-codes';

@Injectable({ providedIn: 'root' })
export class CountryCodeService {
  private cache$?: Observable<CountryCode[]>;

  constructor(private http: HttpClient) {}

  getCodes(): Observable<CountryCode[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<any[]>('https://restcountries.com/v3.1/all?fields=name,idd,cca2')
        .pipe(
          timeout(8000),
          map(countries =>
            countries
              .filter(c => c.idd?.root && c.idd?.suffixes?.length)
              .map(c => {
                const suffix = c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : '';
                return {
                  name: c.name.common,
                  code: c.idd.root + suffix,
                  iso: c.cca2,
                } as CountryCode;
              })
              .filter(c => c.code.length >= 2)
              .sort((a, b) => a.name.localeCompare(b.name))
          ),
          catchError(() => of(COUNTRY_CODES)),
          shareReplay(1)
        );
    }
    return this.cache$;
  }
}
