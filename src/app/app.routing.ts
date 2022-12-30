import { NgModule } from '@angular/core';
import { CommonModule, } from '@angular/common';
import { BrowserModule  } from '@angular/platform-browser';
import { Routes, RouterModule } from '@angular/router';

import { SignupComponent } from './examples/signup/signup.component';
import { LandingComponent } from './examples/landing/landing.component';
import { NucleoiconsComponent } from './components/nucleoicons/nucleoicons.component';
import { HomeComponent } from './pages/home/home.component';
import {ProjectDocsComponent} from './pages/project-docs/project-docs.component';
import {PersonalInfoComponent} from './pages/personal-info/personal-info.component';
import {TutorialsComponent} from './pages/tutorials/tutorials.component';

const routes: Routes =[
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home',                 component: HomeComponent },
    { path: 'documentation/:id',    component: ProjectDocsComponent },
    { path: 'personal-info',        component: PersonalInfoComponent },
    { path: 'tutorial/:ref',        component: TutorialsComponent},
    { path: 'nucleoicons',          component: NucleoiconsComponent }
];

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    RouterModule.forRoot(routes, {
        useHash: false,
        anchorScrolling: 'enabled'
    })
  ],
  exports: [
  ],
})
export class AppRoutingModule { }
