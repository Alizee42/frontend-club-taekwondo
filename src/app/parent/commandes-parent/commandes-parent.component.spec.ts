import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandesParentComponent } from './commandes-parent.component';

describe('CommandesParentComponent', () => {
  let component: CommandesParentComponent;
  let fixture: ComponentFixture<CommandesParentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandesParentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommandesParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
