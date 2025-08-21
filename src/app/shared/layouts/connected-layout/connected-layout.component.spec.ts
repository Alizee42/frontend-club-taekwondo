import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ConnectedLayoutComponent } from './connected-layout.component';

describe('ConnectedLayoutComponent', () => {
  let component: ConnectedLayoutComponent;
  let fixture: ComponentFixture<ConnectedLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ConnectedLayoutComponent,   // standalone
        HttpClientTestingModule,    // pour services Http
        RouterTestingModule         // si <router-outlet> / navigation
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectedLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
