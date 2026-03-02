import logger from '../utils/logger';

type SpanStatusCode = 'OK' | 'ERROR';

interface OpenTelemetrySpan {
  setAttributes: (attributes: Record<string, string | number | boolean>) => void;
  setStatus: (status: { code: number; message?: string }) => void;
  recordException: (exception: Error) => void;
  end: () => void;
}

interface OpenTelemetryTracer {
  startSpan: (name: string, options?: { attributes?: Record<string, string | number | boolean> }) => OpenTelemetrySpan;
}

interface PhoenixOtelModule {
  register: (options: { projectName: string; url?: string; apiKey?: string }) => void;
}

interface OpenTelemetryApiModule {
  trace: {
    getTracer: (name: string) => OpenTelemetryTracer;
  };
  SpanStatusCode?: {
    OK?: number;
    ERROR?: number;
  };
}

const shouldEnablePhoenix = (): boolean => {
  const raw = (process.env.PHOENIX_ENABLED || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
};

const toAttributes = (metadata?: Record<string, unknown> | null): Record<string, string | number | boolean> => {
  if (!metadata) {
    return {};
  }

  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value;
    } else {
      output[key] = JSON.stringify(value);
    }
  }
  return output;
};

let initialized = false;
let enabled = false;
let otelApi: OpenTelemetryApiModule | null = null;

const spanStatusCode = (status: SpanStatusCode): number => {
  const fallback = status === 'ERROR' ? 2 : 1;
  if (!otelApi?.SpanStatusCode) {
    return fallback;
  }
  return status === 'ERROR'
    ? (otelApi.SpanStatusCode.ERROR ?? fallback)
    : (otelApi.SpanStatusCode.OK ?? fallback);
};

export const initializePhoenixObservability = (): void => {
  if (initialized) {
    return;
  }

  initialized = true;
  enabled = shouldEnablePhoenix();

  if (!enabled) {
    return;
  }

  try {
    const phoenix = require('@arizeai/phoenix-otel') as PhoenixOtelModule;
    phoenix.register({
      projectName: process.env.PHOENIX_PROJECT_NAME || 'secondop-agent-analysis',
      url: process.env.PHOENIX_COLLECTOR_URL || process.env.PHOENIX_URL,
      apiKey: process.env.PHOENIX_API_KEY,
    });

    otelApi = require('@opentelemetry/api') as OpenTelemetryApiModule;
    logger.info('Phoenix tracing enabled.');
  } catch (error) {
    enabled = false;
    logger.warn('Phoenix tracing requested but dependencies are unavailable.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export interface SpanHandle {
  addAttributes: (metadata?: Record<string, unknown> | null) => void;
  end: (status: SpanStatusCode, errorMessage?: string) => void;
}

const noopSpan = (): SpanHandle => ({
  addAttributes: () => {},
  end: () => {},
});

export const startPhoenixSpan = (
  name: string,
  metadata?: Record<string, unknown> | null
): SpanHandle => {
  if (!enabled || !otelApi) {
    return noopSpan();
  }

  try {
    const tracer = otelApi.trace.getTracer('secondop.agentic');
    const span = tracer.startSpan(name, { attributes: toAttributes(metadata) });
    return {
      addAttributes: (extra) => {
        const attrs = toAttributes(extra);
        if (Object.keys(attrs).length > 0) {
          span.setAttributes(attrs);
        }
      },
      end: (status, errorMessage) => {
        span.setStatus({
          code: spanStatusCode(status),
          message: errorMessage,
        });
        if (status === 'ERROR' && errorMessage) {
          span.recordException(new Error(errorMessage));
        }
        span.end();
      },
    };
  } catch (error) {
    logger.warn('Failed to create Phoenix span', {
      spanName: name,
      error: error instanceof Error ? error.message : String(error),
    });
    return noopSpan();
  }
};
