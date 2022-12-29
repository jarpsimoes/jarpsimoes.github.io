import { Component, OnInit } from '@angular/core';
import {ContentService} from '../../services/content.service';
import {Tutorial} from '../../interfaces/tutorial';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-tutorials',
  templateUrl: './tutorials.component.html',
  styleUrls: ['./tutorials.component.css']
})
export class TutorialsComponent implements OnInit {

  tutorials: Tutorial[];
  tutorialReference: string | null = null;
  tutorialContent: string | null = null;
  notFound = false;

  constructor(private route: ActivatedRoute, private contentService: ContentService) { }

  ngOnInit(): void {
    this.tutorialReference = this.route.snapshot.paramMap.get('ref');
    this.contentService.getTutorials().subscribe(tut => {
      console.log(this.tutorialReference)
      tut.forEach(t => {
        console.log(t)
        if (this.tutorialReference === t.reference) {
          this.contentService.getContentFileByName('tutorials', t.content).subscribe(content => this.tutorialContent = content);
        }
      })

      if (this.tutorialContent === null) {
        this.notFound = true;
      }
    });
  }

}
