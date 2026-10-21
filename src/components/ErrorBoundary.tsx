import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Si cambia (por ejemplo la ruta), se intenta mostrar la pagina otra vez. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/** Evita que un error en una pagina deje toda la app en negro. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error en la interfaz:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="panel crash">
        <h3>Algo no cargó bien</h3>
        <small className="muted">{this.state.error.message}</small>
        <div>
          <button className="btn" onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
        </div>
      </section>
    );
  }
}
