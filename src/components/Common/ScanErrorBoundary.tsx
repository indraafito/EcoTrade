import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Camera, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ScanErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ScanErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
    // Reload the scan page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-white/10">
            <div className="text-center">
              {/* Camera Error Icon */}
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Scanner Error
              </h1>
              
              <p className="text-muted-foreground mb-8 leading-relaxed">
                The QR scanner encountered an error. This might be due to camera permissions 
                or a temporary glitch. Your data is safe.
              </p>

              {/* Action Button */}
              <Button 
                onClick={this.handleRetry}
                className="w-full h-12 rounded-2xl font-semibold bg-gradient-to-r from-primary to-[#1DBF73]"
                size="lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Restart Scanner
              </Button>

              {/* Troubleshooting Tips */}
              <div className="mt-6 text-left bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                  Quick Tips:
                </p>
                <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                  <li>• Check if camera permissions are enabled</li>
                  <li>• Try refreshing the page</li>
                  <li>• Use a different browser if needed</li>
                  <li>• Ensure you're using HTTPS</li>
                </ul>
              </div>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Error Details (Dev)
                  </summary>
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs font-mono text-red-800 dark:text-red-200 overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ScanErrorBoundary;
