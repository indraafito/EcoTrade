import { toast } from "sonner";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  onRetry: () => {},
  shouldRetry: (error) => {
    // Retry on network errors and 5xx server errors
    return (
      error instanceof TypeError || // Network error
      error.message?.includes('fetch') ||
      error.status >= 500 ||
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('timeout')
    );
  }
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateDelay = (attempt: number, options: Required<RetryOptions>): number => {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
  const delay = exponentialDelay + jitter;
  return Math.min(delay, options.maxDelay);
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!opts.shouldRetry(error) || attempt === opts.maxAttempts) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, opts);
      
      // Notify about retry
      opts.onRetry(attempt, error);
      
      // Show toast notification for retries (except in test environment)
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        if (attempt === 1) {
          toast.info("Connection issue, retrying...", {
            description: `Attempt ${attempt}/${opts.maxAttempts}`,
            duration: 2000
          });
        }
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All attempts failed, throw the last error
  throw lastError;
}

/**
 * Retry wrapper for Supabase operations
 */
export async function supabaseRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T; error: null }> {
  const result = await withRetry(async () => {
    const response = await operation();
    
    if (response.error) {
      throw response.error;
    }
    
    if (!response.data) {
      throw new Error('No data returned from operation');
    }
    
    return response;
  }, options);

  return {
    data: result.data,
    error: null
  };
}

/**
 * Quick retry for common operations
 */
export const quickRetry = {
  /**
   * Retry single record fetch
   */
  async fetchOne<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    tableName: string
  ): Promise<{ data: T | null; error: any }> {
    try {
      return await supabaseRetry(operation, {
        maxAttempts: 2,
        baseDelay: 500,
        onRetry: (attempt) => {
          console.warn(`Retrying ${tableName} fetch, attempt ${attempt}`);
        }
      });
    } catch (error) {
      toast.error(`Failed to load ${tableName}`);
      return { data: null, error };
    }
  },

  /**
   * Retry insert operation
   */
  async insert<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    itemName: string
  ): Promise<{ data: T | null; error: any }> {
    try {
      return await supabaseRetry(operation, {
        maxAttempts: 3,
        baseDelay: 1000,
        onRetry: (attempt) => {
          toast.info(`Saving ${itemName}, retrying...`, {
            description: `Attempt ${attempt}/3`
          });
        }
      });
    } catch (error) {
      toast.error(`Failed to save ${itemName}`);
      return { data: null, error };
    }
  },

  /**
   * Retry update operation
   */
  async update<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    itemName: string
  ): Promise<{ data: T | null; error: any }> {
    try {
      return await supabaseRetry(operation, {
        maxAttempts: 2,
        baseDelay: 500,
        onRetry: (attempt) => {
          toast.info(`Updating ${itemName}, retrying...`, {
            description: `Attempt ${attempt}/2`
          });
        }
      });
    } catch (error) {
      toast.error(`Failed to update ${itemName}`);
      return { data: null, error };
    }
  }
};

/**
 * Network-aware retry - checks if user is online
 */
export async function networkAwareRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Check if online
  if (!navigator.onLine) {
    toast.error("You're offline. Please check your internet connection.");
    throw new Error('Network unavailable');
  }

  return withRetry(operation, {
    ...options,
    shouldRetry: (error) => {
      const defaultRetry = DEFAULT_OPTIONS.shouldRetry(error);
      const isOffline = !navigator.onLine;
      
      // Don't retry if offline, let the user reconnect first
      if (isOffline) {
        toast.error("Connection lost. Please check your internet connection.");
        return false;
      }
      
      return defaultRetry;
    }
  });
}
