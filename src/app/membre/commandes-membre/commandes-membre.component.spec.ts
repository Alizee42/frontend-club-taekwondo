import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandesMembreComponent } from './commandes-membre.component';

describe('CommandesMembreComponent', () => {
  let component: CommandesMembreComponent;
  let fixture: ComponentFixture<CommandesMembreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandesMembreComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommandesMembreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
