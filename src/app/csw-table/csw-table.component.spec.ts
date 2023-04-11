import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CswTableComponent } from './csw-table.component';

describe('CswTableComponent', () => {
  let component: CswTableComponent;
  let fixture: ComponentFixture<CswTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CswTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CswTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
