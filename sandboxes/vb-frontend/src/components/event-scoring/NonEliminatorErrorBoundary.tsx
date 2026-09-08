import React from 'react';

type Props = {
  children: React.ReactNode;
  resetKey?: string;
};

type State = {
  hasError: boolean;
  prevResetKey?: string;
};

class NonEliminatorErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, prevResetKey: this.props.resetKey };

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.prevResetKey) {
      return { hasError: false, prevResetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Match-play scoring view failed to render. Refresh the round and try again.
        </div>
      );
    }
    return this.props.children;
  }
}

export default NonEliminatorErrorBoundary;
