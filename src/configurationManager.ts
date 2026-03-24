import * as vscode from 'vscode';

export interface ExtensionConfig {
  racketPath: string;
  serverScriptPath: string;
  trace: {
    server: 'off' | 'messages' | 'verbose';
  };
}

export class ConfigurationManager {
  private static readonly CONFIG_SECTION = 'treason';
  private static readonly DEFAULT_RACKET_PATH = 'racket';
  private static readonly DEFAULT_SERVER_SCRIPT_PATH = '../treason/server.rkt';
  private static readonly DEFAULT_TRACE_SERVER = 'off';

  /**
   * Reads the VSCode workspace configuration for the Treason extension.
   * Provides default values for racketPath and serverScriptPath if not configured.
   * 
   * Requirements: 4.1, 4.2, 4.3
   */
  getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
    
    return {
      racketPath: config.get<string>('racketPath', ConfigurationManager.DEFAULT_RACKET_PATH),
      serverScriptPath: config.get<string>('serverScriptPath', ConfigurationManager.DEFAULT_SERVER_SCRIPT_PATH),
      trace: {
        server: config.get<'off' | 'messages' | 'verbose'>('trace.server', ConfigurationManager.DEFAULT_TRACE_SERVER)
      }
    };
  }

  /**
   * Registers a listener for configuration changes.
   * The callback is invoked whenever the Treason configuration is updated.
   * 
   * Requirements: 4.3
   */
  onConfigChange(callback: (config: ExtensionConfig) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
        callback(this.getConfig());
      }
    });
  }
}
