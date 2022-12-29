import { BrowserModule } from '@angular/platform-browser';
import {NgModule, SecurityContext} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {NgbCarouselModule, NgbModule, NgbNav, NgbNavModule} from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app.routing';

import { AppComponent } from './app.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';

import { ComponentsModule } from './components/components.module';
import { ExamplesModule } from './examples/examples.module';
import { HomeComponent } from './pages/home/home.component';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import { ProjectDocsComponent } from './pages/project-docs/project-docs.component';
import {MarkdownModule} from 'ngx-markdown';
import { PersonalInfoComponent } from './pages/personal-info/personal-info.component';
import { TutorialsComponent } from './pages/tutorials/tutorials.component';


@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    HomeComponent,
    ProjectDocsComponent,
    PersonalInfoComponent,
    TutorialsComponent
  ],
    imports: [
        BrowserModule,
        NgbModule,
        FormsModule,
        RouterModule,
        ComponentsModule,
        ExamplesModule,
        AppRoutingModule,
        HttpClientModule,
        NgbCarouselModule,
        NgbNavModule,
        MarkdownModule.forRoot({ loader: HttpClient, sanitize: SecurityContext.NONE })
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
