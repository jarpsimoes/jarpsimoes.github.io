import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectDocsComponent } from './project-docs.component';

describe('ProjectDocsComponent', () => {
  let component: ProjectDocsComponent;
  let fixture: ComponentFixture<ProjectDocsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectDocsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectDocsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
