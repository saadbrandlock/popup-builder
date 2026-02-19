import React from 'react';
import { Alert } from 'antd';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ClientFlowErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          message="Something went wrong in this step."
          description={this.state.error?.message}
          showIcon
          style={{ margin: 24 }}
        />
      );
    }
    return this.props.children;
  }
}
