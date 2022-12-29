import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {CertificationEntity} from '../interfaces/certification-entity';
import {Technologies} from '../interfaces/technologies';
import {Tutorial} from '../interfaces/tutorial';

@Injectable({
  providedIn: 'root'
})
export class ContentService {

  constructor(private http: HttpClient) { }

  getContentFileByName(module: string, fileName: string) {
    return this.http.get(`assets/content/${module}/${fileName}`, {
      responseType: 'text'
    })
  }
  getCertifications() {
    return this.http.get<CertificationEntity[]>('assets/content/personal-info/certifications.json')
  }
  getTechnologies() {
    return this.http.get<Technologies[]>('assets/content/personal-info/technologies.json')
  }
  getTutorials() {
    return this.http.get<Tutorial[]>('assets/content/tutorials/data.json')
  }
}
