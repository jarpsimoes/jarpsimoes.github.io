import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Project} from '../interfaces/project';
import {Readme} from '../interfaces/readme';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  reposUrl = 'https://api.github.com/users/jarpsimoes/repos';
  repoApiUrl = 'https://api.github.com/repos/jarpsimoes'

  constructor(private http: HttpClient) { }

  getProjects() {
    return this.http.get<Project[]>(this.reposUrl);
  }
  getMarkdownReadmeFromGit(repoName: string) {
    return this.http.get<Readme>(`${this.repoApiUrl}/${repoName}/readme`)
  }
  getReadmeContent(downloadUrl: string) {
    return this.http.get(downloadUrl, {
      responseType: 'text'
    })
  }
}
