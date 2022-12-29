import { Component, OnInit } from '@angular/core';
import {ContentService} from '../../services/content.service';
import {CertificationEntity} from '../../interfaces/certification-entity';

@Component({
  selector: 'app-personal-info',
  templateUrl: './personal-info.component.html',
  styleUrls: ['./personal-info.component.css']
})
export class PersonalInfoComponent implements OnInit {
  contentString: string
  contentCertifications: CertificationEntity[] = []
  loading = true;
  loadingCertifications = true;
  constructor(private content: ContentService) { }

  ngOnInit(): void {

    this.content.getContentFileByName('personal-info', 'personal-info.md').subscribe(content => {
      this.contentString = content.toString()
      this.loading = false
    })

    this.content.getCertifications().subscribe((content: CertificationEntity[]) => {
      this.loadingCertifications = false;
      this.contentCertifications = content;
    })

  }
}
