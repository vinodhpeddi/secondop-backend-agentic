import { AgenticError, AgenticLoopState, AgenticRuntimeContext } from '../core/types';
import { LangChainAgentAdapter, LangChainRunResult } from './types';

export const isLangChainRuntimeEnabled = (): boolean => {
  return (process.env.AGENTIC_RUNTIME || 'native').toLowerCase() === 'langchain';
};

const buildUnsupportedError = (): AgenticError => {
  return new AgenticError(
    'policy_error',
    'AGENTIC_RUNTIME=langchain is enabled but no LangChain adapter is configured yet.'
  );
};

class NoopLangChainAdapter implements LangChainAgentAdapter {
  public async run(_context: AgenticRuntimeContext): Promise<LangChainRunResult> {
    throw buildUnsupportedError();
  }
}

const defaultNoopAdapter = new NoopLangChainAdapter();

let configuredAdapter: LangChainAgentAdapter | null = null;

export const configureLangChainAdapter = (adapter: LangChainAgentAdapter): void => {
  configuredAdapter = adapter;
};

export const runAgenticViaLangChain = async (
  context: AgenticRuntimeContext,
  _fallbackState: AgenticLoopState
): Promise<LangChainRunResult> => {
  const adapter = configuredAdapter || defaultNoopAdapter;

  try {
    return await adapter.run(context);
  } catch (error) {
    if (error instanceof AgenticError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new AgenticError('unknown_error', `LangChain runtime failed: ${error.message}`);
    }

    throw new AgenticError('unknown_error', 'LangChain runtime failed with unknown error');
  }
};
