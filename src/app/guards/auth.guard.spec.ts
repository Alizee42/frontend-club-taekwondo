import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: routerSpy }
      ]
    });
    authGuard = TestBed.inject(AuthGuard);
  });

  it('should allow access if token and role are valid', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'token') return 'valid-token';
      if (key === 'role') return 'admin';
      return null;
    });

    const result = authGuard.canActivate({} as any, {} as any);
    expect(result).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should deny access if token is missing', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'role') return 'admin';
      return null;
    });

    const result = authGuard.canActivate({} as any, {} as any);
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/connexion']);
  });

  it('should deny access if role is invalid', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'token') return 'valid-token';
      if (key === 'role') return 'unknown-role';
      return null;
    });

    const result = authGuard.canActivate({} as any, {} as any);
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/connexion']);
  });

  it('should deny access if both token and role are missing', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);

    const result = authGuard.canActivate({} as any, {} as any);
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/connexion']);
  });
});