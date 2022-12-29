import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ProjectsService} from '../../services/projects.service';
import {Readme} from '../../interfaces/readme';

@Component({
  selector: 'app-project-docs',
  templateUrl: './project-docs.component.html',
  styleUrls: ['./project-docs.component.css']
})
export class ProjectDocsComponent implements OnInit {
  name: string;
  content_string: string;
  loading = true;
  constructor(private route: ActivatedRoute, private projectService: ProjectsService) { }

  ngOnInit(): void {
    this.name = this.route.snapshot.paramMap.get('id');
    this.getProject()
  }

  getProject() {
    this.projectService.getMarkdownReadmeFromGit(this.name).subscribe((r: Readme) => {

      this.projectService.getReadmeContent(r.download_url).subscribe(content => {
        this.content_string = content.toString();
        this.loading = false;
      })

    })
  }

}
