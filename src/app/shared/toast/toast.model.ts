export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;        // ms (0 = ne se ferme pas)
  position: ToastPosition; // ex: 'top-right'
  dismissible: boolean;    // bouton × visible
}
