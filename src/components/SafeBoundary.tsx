import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SafeBoundaryProps {
  /** Nome do módulo isolado — usado apenas no log. */
  name: string;
  /** O que renderizar caso o módulo falhe (padrão: nada). */
  fallback?: ReactNode;
  children: ReactNode;
}

interface SafeBoundaryState {
  failed: boolean;
}

/**
 * Limite de erro modular: mantém o resto da aplicação de pé quando um módulo
 * isolado (ex.: central de notificações) falha em tempo de execução.
 */
export class SafeBoundary extends Component<SafeBoundaryProps, SafeBoundaryState> {
  state: SafeBoundaryState = { failed: false };

  static getDerivedStateFromError(): SafeBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SafeBoundary:${this.props.name}]`, error, info.componentStack);
    if (import.meta.env.DEV) {
      try {
        sessionStorage.setItem(
          `safe_boundary_${this.props.name}`,
          `${error?.message ?? error}\n${error?.stack ?? ''}\n${info.componentStack ?? ''}`.slice(0, 4000)
        );
      } catch {
        /* ignore */
      }
    }
  }


  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
