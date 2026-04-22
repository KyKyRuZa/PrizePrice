import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '20px',
          textAlign: 'center',
        }}>
          <h1 style={{ color: '#002870', marginBottom: '16px' }}>Что-то пошло не так</h1>
          <p style={{ color: '#666', marginBottom: '24px', maxWidth: '400px' }}>
            Произошла ошибка при загрузке страницы. Попробуйте обновить страницу или вернуться на главную.
          </p>
          <button
            onClick={this.handleGoHome}
            style={{
              padding: '12px 24px',
              background: '#002870',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            На главную
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
