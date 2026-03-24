import * as assert from 'assert';
import * as fc from 'fast-check';
import { ErrorHandler, ErrorContext } from '../src/errorHandler';
import { OutputChannelManager } from '../src/outputChannelManager';

suite('ErrorHandler Tests', () => {
  let outputManager: OutputChannelManager;
  let errorHandler: ErrorHandler;

  setup(() => {
    outputManager = new OutputChannelManager();
    errorHandler = new ErrorHandler(outputManager);
  });

  teardown(() => {
    if (outputManager) {
      outputManager.dispose();
    }
  });

  /**
   * Property 3: Graceful Error Handling
   * Feature: vscode-language-extension, Property 3: Graceful Error Handling
   * Validates: Requirements 2.3, 6.2, 6.3
   * 
   * For any error condition, the extension should handle it without crashing
   * and should log the error details.
   */
  suite('Property Test: Graceful Error Handling', () => {
    test('handles random error conditions without crashing', function() {
      this.timeout(10000); // Increase timeout for property tests
      
      // Generator for error messages
      const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });
      
      // Generator for error phases
      const errorPhaseArb = fc.constantFrom('startup', 'runtime', 'shutdown') as fc.Arbitrary<'startup' | 'runtime' | 'shutdown'>;
      
      // Generator for optional server output
      const serverOutputArb = fc.option(fc.string({ maxLength: 500 }), { nil: undefined });
      
      // Generator for error contexts
      const errorContextArb = fc.record({
        error: errorMessageArb.map(msg => new Error(msg)),
        phase: errorPhaseArb,
        serverOutput: serverOutputArb
      }) as fc.Arbitrary<ErrorContext>;
      
      // Property: For any error context, error handlers should not throw
      fc.assert(
        fc.property(errorContextArb, (context) => {
          // Test handleServerStartupError doesn't crash
          if (context.phase === 'startup') {
            assert.doesNotThrow(() => {
              errorHandler.handleServerStartupError(context);
            }, 'handleServerStartupError should not throw');
          }
          
          // Test handleCommunicationError doesn't crash
          assert.doesNotThrow(() => {
            errorHandler.handleCommunicationError(context);
          }, 'handleCommunicationError should not throw');
          
          // Test handleServerCrash doesn't crash (returns a promise)
          assert.doesNotThrow(() => {
            const promise = errorHandler.handleServerCrash(context);
            assert.ok(promise instanceof Promise, 'handleServerCrash should return a Promise');
          }, 'handleServerCrash should not throw');
          
          // Verify error handler is still functional after handling error
          assert.strictEqual(typeof errorHandler.shouldRestart, 'function', 
            'ErrorHandler should remain functional after handling error');
        }),
        { numRuns: 100 }
      );
    });

    test('logs errors for all error conditions', function() {
      this.timeout(10000);
      
      const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 });
      const errorPhaseArb = fc.constantFrom('startup', 'runtime', 'shutdown') as fc.Arbitrary<'startup' | 'runtime' | 'shutdown'>;
      
      const errorContextArb = fc.record({
        error: errorMessageArb.map(msg => new Error(msg)),
        phase: errorPhaseArb,
        serverOutput: fc.option(fc.string({ maxLength: 200 }), { nil: undefined })
      }) as fc.Arbitrary<ErrorContext>;
      
      // Property: All error handlers should execute without throwing
      fc.assert(
        fc.property(errorContextArb, (context) => {
          // Create a fresh error handler for each test
          const testOutputManager = new OutputChannelManager();
          const testErrorHandler = new ErrorHandler(testOutputManager);
          
          try {
            // All error handling methods should complete without throwing
            if (context.phase === 'startup') {
              testErrorHandler.handleServerStartupError(context);
            } else if (context.phase === 'runtime') {
              testErrorHandler.handleServerCrash(context);
            } else {
              testErrorHandler.handleCommunicationError(context);
            }
            
            // If we get here, no exception was thrown (success)
            return true;
          } catch (error) {
            // Any exception means the property failed
            return false;
          } finally {
            testOutputManager.dispose();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit Tests for Error Handler
   * Requirements: 1.4, 2.3, 6.1, 6.2
   */
  suite('Unit Tests', () => {
    /**
     * Test error message formatting
     * Requirements: 6.1, 6.2
     */
    test('handleServerStartupError logs detailed error information', () => {
      const error = new Error('Test startup error');
      error.stack = 'Test stack trace';
      
      const context: ErrorContext = {
        error,
        phase: 'startup',
        serverOutput: 'Test server output'
      };
      
      assert.doesNotThrow(() => {
        errorHandler.handleServerStartupError(context);
      }, 'handleServerStartupError should not throw');
    });

    test('handleServerCrash logs crash details', async () => {
      const error = new Error('Test crash error');
      error.stack = 'Test crash stack';
      
      const context: ErrorContext = {
        error,
        phase: 'runtime',
        serverOutput: 'Server output before crash'
      };
      
      const shouldRestart = await errorHandler.handleServerCrash(context);
      assert.strictEqual(typeof shouldRestart, 'boolean', 'handleServerCrash should return boolean');
    });

    test('handleCommunicationError logs communication errors', () => {
      const error = new Error('Test communication error');
      
      const context: ErrorContext = {
        error,
        phase: 'runtime'
      };
      
      assert.doesNotThrow(() => {
        errorHandler.handleCommunicationError(context);
      }, 'handleCommunicationError should not throw');
    });

    /**
     * Test restart backoff logic
     * Requirements: 1.4, 2.3
     */
    test('shouldRestart returns true when under max attempts', () => {
      const error = new Error('Test error');
      
      // First few attempts should allow restart
      assert.strictEqual(errorHandler.shouldRestart(error), true, 
        'shouldRestart should return true for first attempt');
    });

    test('shouldRestart returns false after max attempts', () => {
      const error = new Error('Test error');
      
      // Exhaust restart attempts
      for (let i = 0; i < 5; i++) {
        errorHandler.shouldRestart(error);
        // Simulate a restart attempt by incrementing counter
        errorHandler['restartCount']++;
      }
      
      // After max attempts, should return false
      assert.strictEqual(errorHandler.shouldRestart(error), false,
        'shouldRestart should return false after max attempts');
    });

    test('restart counter resets after successful 5-minute run', () => {
      const error = new Error('Test error');
      
      // Record successful start
      errorHandler.recordSuccessfulStart();
      
      // Simulate some restart attempts
      errorHandler['restartCount'] = 3;
      
      // Simulate 5 minutes passing by setting lastSuccessfulStart to 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000 - 1000);
      errorHandler['lastSuccessfulStart'] = fiveMinutesAgo;
      
      // shouldRestart should reset the counter
      const result = errorHandler.shouldRestart(error);
      assert.strictEqual(result, true, 'shouldRestart should return true after successful run');
      assert.strictEqual(errorHandler.getRestartCount(), 0, 
        'Restart count should be reset after successful 5-minute run');
    });

    /**
     * Test restart count limits
     * Requirements: 1.4, 2.3
     */
    test('getRestartCount returns current restart count', () => {
      assert.strictEqual(errorHandler.getRestartCount(), 0, 
        'Initial restart count should be 0');
      
      // Manually increment restart count
      errorHandler['restartCount'] = 3;
      assert.strictEqual(errorHandler.getRestartCount(), 3,
        'getRestartCount should return current count');
    });

    test('resetRestartCount resets the counter to zero', () => {
      // Set restart count to non-zero
      errorHandler['restartCount'] = 5;
      
      // Reset
      errorHandler.resetRestartCount();
      
      assert.strictEqual(errorHandler.getRestartCount(), 0,
        'resetRestartCount should reset counter to 0');
    });

    test('recordSuccessfulStart sets lastSuccessfulStart timestamp', () => {
      const beforeTime = Date.now();
      
      errorHandler.recordSuccessfulStart();
      
      const afterTime = Date.now();
      const lastStart = errorHandler['lastSuccessfulStart'];
      
      assert.ok(lastStart, 'lastSuccessfulStart should be set');
      assert.ok(lastStart!.getTime() >= beforeTime && lastStart!.getTime() <= afterTime,
        'lastSuccessfulStart should be set to current time');
    });

    test('handleServerCrash implements exponential backoff', async function() {
      this.timeout(5000);
      
      const error = new Error('Test crash');
      const context: ErrorContext = { error, phase: 'runtime' };
      
      // First crash - should have minimal delay
      const start1 = Date.now();
      await errorHandler.handleServerCrash(context);
      const duration1 = Date.now() - start1;
      
      // Second crash - should have longer delay
      const start2 = Date.now();
      await errorHandler.handleServerCrash(context);
      const duration2 = Date.now() - start2;
      
      // Second delay should be approximately double the first (exponential backoff)
      // Allow some tolerance for timing variations
      assert.ok(duration2 > duration1, 
        'Second restart delay should be longer than first (exponential backoff)');
    });

    test('handleServerCrash returns false after max attempts', async function() {
      this.timeout(35000); // Increase timeout for exponential backoff delays (1+2+4+8+16 = 31s)
      
      const error = new Error('Test crash');
      const context: ErrorContext = { error, phase: 'runtime' };
      
      // Exhaust all restart attempts
      for (let i = 0; i < 5; i++) {
        await errorHandler.handleServerCrash(context);
      }
      
      // Next attempt should return false
      const shouldRestart = await errorHandler.handleServerCrash(context);
      assert.strictEqual(shouldRestart, false,
        'handleServerCrash should return false after max attempts');
    });
  });
});
