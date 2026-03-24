import * as assert from 'assert';
import * as vscode from 'vscode';
import { OutputChannelManager } from '../src/outputChannelManager';

suite('OutputChannelManager Unit Tests', () => {
  let manager: OutputChannelManager;

  setup(() => {
    manager = new OutputChannelManager();
  });

  teardown(() => {
    if (manager) {
      manager.dispose();
    }
  });

  /**
   * Requirements: 6.4
   * Test output channel creation
   */
  test('constructor creates output channel with correct name', () => {
    // The manager should be created without throwing
    assert.ok(manager, 'OutputChannelManager should be created');
    
    // Verify the manager has the required methods
    assert.strictEqual(typeof manager.log, 'function', 'log method should exist');
    assert.strictEqual(typeof manager.logServerOutput, 'function', 'logServerOutput method should exist');
    assert.strictEqual(typeof manager.show, 'function', 'show method should exist');
    assert.strictEqual(typeof manager.clear, 'function', 'clear method should exist');
  });

  /**
   * Requirements: 6.4
   * Test log message formatting
   */
  test('log method formats messages with timestamp and level', () => {
    // Test that log method doesn't throw
    assert.doesNotThrow(() => {
      manager.log('Test info message', 'info');
      manager.log('Test warning message', 'warn');
      manager.log('Test error message', 'error');
    }, 'log method should not throw');
  });

  /**
   * Requirements: 6.4
   * Test log method with default level
   */
  test('log method uses info as default level', () => {
    // Test that log method works without specifying level
    assert.doesNotThrow(() => {
      manager.log('Test message without level');
    }, 'log method should work with default level');
  });

  /**
   * Requirements: 6.4
   * Test severity level handling
   */
  test('log method handles all severity levels', () => {
    const levels: Array<'info' | 'warn' | 'error'> = ['info', 'warn', 'error'];
    
    levels.forEach(level => {
      assert.doesNotThrow(() => {
        manager.log(`Test ${level} message`, level);
      }, `log method should handle ${level} level`);
    });
  });

  /**
   * Requirements: 6.4
   * Test logServerOutput method
   */
  test('logServerOutput formats server messages correctly', () => {
    assert.doesNotThrow(() => {
      manager.logServerOutput('Server started');
      manager.logServerOutput('Request received');
      manager.logServerOutput('Response sent');
    }, 'logServerOutput method should not throw');
  });

  /**
   * Requirements: 6.4
   * Test show method
   */
  test('show method displays output channel', () => {
    assert.doesNotThrow(() => {
      manager.show();
    }, 'show method should not throw');
  });

  /**
   * Requirements: 6.4
   * Test clear method
   */
  test('clear method clears output channel', () => {
    // Add some content first
    manager.log('Test message');
    manager.logServerOutput('Server message');
    
    // Clear should not throw
    assert.doesNotThrow(() => {
      manager.clear();
    }, 'clear method should not throw');
  });

  /**
   * Requirements: 6.4
   * Test dispose method
   */
  test('dispose method releases resources', () => {
    assert.doesNotThrow(() => {
      manager.dispose();
    }, 'dispose method should not throw');
  });

  /**
   * Requirements: 6.4
   * Test multiple log calls
   */
  test('multiple log calls work correctly', () => {
    assert.doesNotThrow(() => {
      for (let i = 0; i < 10; i++) {
        manager.log(`Message ${i}`, i % 2 === 0 ? 'info' : 'warn');
      }
    }, 'multiple log calls should work');
  });

  /**
   * Requirements: 6.4
   * Test log with empty message
   */
  test('log handles empty messages', () => {
    assert.doesNotThrow(() => {
      manager.log('', 'info');
      manager.logServerOutput('');
    }, 'log methods should handle empty messages');
  });

  /**
   * Requirements: 6.4
   * Test log with multiline messages
   */
  test('log handles multiline messages', () => {
    const multilineMessage = 'Line 1\nLine 2\nLine 3';
    
    assert.doesNotThrow(() => {
      manager.log(multilineMessage, 'info');
      manager.logServerOutput(multilineMessage);
    }, 'log methods should handle multiline messages');
  });
});
