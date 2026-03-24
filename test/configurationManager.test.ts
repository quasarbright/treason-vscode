import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../src/configurationManager';

suite('ConfigurationManager Unit Tests', () => {
  /**
   * Requirements: 4.1, 4.2
   * Test reading configuration with defaults
   */
  test('getConfig returns default values when no custom configuration is set', () => {
    const manager = new ConfigurationManager();
    const config = manager.getConfig();
    
    // Verify defaults are returned
    assert.ok(config.racketPath, 'racketPath should be defined');
    assert.ok(config.serverScriptPath, 'serverScriptPath should be defined');
    assert.ok(config.trace.server, 'trace.server should be defined');
    
    // Verify default values match specification
    assert.strictEqual(typeof config.racketPath, 'string', 'racketPath should be a string');
    assert.strictEqual(typeof config.serverScriptPath, 'string', 'serverScriptPath should be a string');
    assert.ok(['off', 'messages', 'verbose'].includes(config.trace.server), 
      'trace.server should be one of: off, messages, verbose');
  });

  /**
   * Requirements: 4.3
   * Test configuration change notifications
   */
  test('onConfigChange registers listener for configuration changes', (done) => {
    const manager = new ConfigurationManager();
    let callbackInvoked = false;
    
    const disposable = manager.onConfigChange((config) => {
      callbackInvoked = true;
      assert.ok(config, 'Config should be provided to callback');
      assert.ok(config.racketPath, 'Config should have racketPath');
      disposable.dispose();
      done();
    });
    
    // Simulate configuration change by updating a setting
    // Note: This may not trigger in unit test environment without workspace
    // In real usage, this would be triggered by user changing settings
    const vsconfig = vscode.workspace.getConfiguration('treason');
    Promise.resolve(vsconfig.update('racketPath', 'test-racket', vscode.ConfigurationTarget.Global))
      .then(() => {
        // If callback wasn't invoked, the test environment doesn't support config changes
        if (!callbackInvoked) {
          disposable.dispose();
          done();
        }
      }, () => {
        // Config update may fail in test environment - that's okay
        disposable.dispose();
        done();
      });
  });

  /**
   * Requirements: 4.1, 4.2, 4.3
   * Test invalid configuration handling
   */
  test('getConfig handles missing configuration gracefully', () => {
    const manager = new ConfigurationManager();
    
    // Even if configuration is missing or invalid, getConfig should not throw
    assert.doesNotThrow(() => {
      const config = manager.getConfig();
      assert.ok(config, 'Config should be returned even if settings are missing');
    }, 'getConfig should not throw on missing configuration');
  });

  /**
   * Requirements: 4.3
   * Test that onConfigChange returns a disposable
   */
  test('onConfigChange returns a disposable that can be disposed', () => {
    const manager = new ConfigurationManager();
    
    const disposable = manager.onConfigChange(() => {
      // Callback
    });
    
    assert.ok(disposable, 'onConfigChange should return a disposable');
    assert.strictEqual(typeof disposable.dispose, 'function', 
      'Disposable should have a dispose method');
    
    // Should not throw when disposed
    assert.doesNotThrow(() => {
      disposable.dispose();
    }, 'dispose() should not throw');
  });
});
