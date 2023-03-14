import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HtmlSnackbarComponent } from './html-snackbar.component';

describe('HtmlSnackbarComponent', () => {
  let component: HtmlSnackbarComponent;
  let fixture: ComponentFixture<HtmlSnackbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HtmlSnackbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HtmlSnackbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
