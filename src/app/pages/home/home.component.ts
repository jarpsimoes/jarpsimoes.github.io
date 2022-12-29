import { Component, OnInit } from '@angular/core';
import {ProjectsService} from '../../services/projects.service';
import {Project} from '../../interfaces/project';
import {Technologies} from '../../interfaces/technologies';
import {ContentService} from '../../services/content.service';
import {CertificationEntity} from '../../interfaces/certification-entity';
import {Tutorial} from '../../interfaces/tutorial';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  projects: Project[] = [];
  imgType = {
    'kubernetes': './assets/img/kubernetes-type.jpg',
    'docker': './assets/img/docker-type.jpg',
    'python': './assets/img/python-type.jpg',
    'golang': './assets/img/golang-type.jpg',
    'terraform': './assets/img/terraform-type.png'
  };
  technologies: Technologies[];
  certifications: CertificationEntity[];
  tutorials: Tutorial[];
  constructor(private projectService: ProjectsService,
  private contentService: ContentService) { }

  ngOnInit(): void {
    this.getProjects();
    this.contentService.getTechnologies().subscribe(tech => this.technologies = tech)
    this.contentService.getCertifications().subscribe(cert => this.certifications = cert)
    this.contentService.getTutorials().subscribe(tut => {
      this.tutorials = tut
    })
  }

  getProjects() {
    this.projectService.getProjects().subscribe((data: Project[]) => {

      if (data === undefined) { return }

      data.forEach(row => {

        const listImage = this.getPublishedType(row.topics);
        if ( listImage !== undefined) {
          row.list_image  = listImage;
          this.projects.push(row)
        }

      })

    })
  }
  getPublishedType(topics: string[]) {

    let publishType = '';

    topics.forEach(topic => {
      if (topic.startsWith('published-')) {
        const pubArr = topic.split('-')
        publishType = this.imgType[pubArr[1]]
      }
    })

    return publishType === '' ? undefined : publishType;

  }
}
