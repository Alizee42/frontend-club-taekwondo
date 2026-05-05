export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  position: ToastPosition;
  dismissible: boolean;
  leaving?: boolean;
}
