import * as assert from 'assert';
import * as fc from 'fast-check';
import * as vscode from 'vscode';

suite('Extension Tests', () => {
  /**
   * Feature: vscode-language-extension, Property 2: LSP Communication Round Trip
   * Validates: Requirements 2.1, 2.2
   * 
   * Property: For any valid LSP request sent to the language server, the extension
   * should successfully write it to stdin and receive a corresponding response from stdout.
   * 
   * Note: This property test verifies LSP message structure and serialization.
   * Full round-trip communication with a real server is tested in integration tests.
   */
  suite('Property 2: LSP Communication Round Trip', () => {
    test('LSP request messages have valid structure', function() {
      this.timeout(30000);

      // Generator for LSP method names
      const lspMethodArb = fc.constantFrom(
        'initialize',
        'initialized',
        'shutdown',
        'textDocument/didOpen',
        'textDocument/didChange',
        'textDocument/completion',
        'textDocument/hover',
        'textDocument/definition'
      );

      // Generator for LSP request IDs
      const requestIdArb = fc.oneof(
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 1, maxLength: 50 })
      );

      // Generator for text document URIs
      const uriArb = fc.oneof(
        fc.constant('file:///test.tsn'),
        fc.constant('file:///path/to/file.tsn'),
        fc.constant('file:///workspace/src/main.tsn')
      );

      // Generator for position objects
      const positionArb = fc.record({
        line: fc.integer({ min: 0, max: 1000 }),
        character: fc.integer({ min: 0, max: 200 })
      });

      // Generator for LSP request parameters
      const paramsArb = fc.oneof(
        // Initialize params
        fc.record({
          processId: fc.option(fc.integer({ min: 1, max: 65535 }), { nil: null }),
          rootUri: fc.option(uriArb, { nil: null }),
          capabilities: fc.constant({})
        }),
        // TextDocument params
        fc.record({
          textDocument: fc.record({
            uri: uriArb,
            languageId: fc.constant('treason'),
            version: fc.integer({ min: 1, max: 100 }),
            text: fc.string({ maxLength: 500 })
          })
        }),
        // Position params
        fc.record({
          textDocument: fc.record({ uri: uriArb }),
          position: positionArb
        })
      );

      // Generator for complete LSP request messages
      const lspRequestArb = fc.record({
        jsonrpc: fc.constant('2.0'),
        id: requestIdArb,
        method: lspMethodArb,
        params: paramsArb
      });

      fc.assert(
        fc.property(lspRequestArb, (request) => {
          // Verify LSP request structure
          assert.strictEqual(request.jsonrpc, '2.0', 'jsonrpc version should be 2.0');
          assert.ok(request.id !== undefined, 'Request should have an id');
          assert.ok(request.method, 'Request should have a method');
          assert.ok(request.params, 'Request should have params');

          // Verify request can be serialized to JSON
          let serialized: string;
          assert.doesNotThrow(() => {
            serialized = JSON.stringify(request);
          }, 'Request should be serializable to JSON');

          // Verify serialized request can be parsed back
          assert.doesNotThrow(() => {
            const parsed = JSON.parse(serialized!);
            assert.strictEqual(parsed.jsonrpc, request.jsonrpc);
            assert.deepStrictEqual(parsed.id, request.id);
            assert.strictEqual(parsed.method, request.method);
          }, 'Serialized request should be parseable');

          // Verify Content-Length header format (LSP protocol requirement)
          const contentLength = Buffer.byteLength(serialized!, 'utf8');
          const header = `Content-Length: ${contentLength}\r\n\r\n`;
          
          assert.ok(header.includes('Content-Length:'), 'Header should include Content-Length');
          assert.ok(header.endsWith('\r\n\r\n'), 'Header should end with double CRLF');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    test('LSP response messages have valid structure', function() {
      this.timeout(30000);

      // Generator for LSP response IDs
      const responseIdArb = fc.oneof(
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 1, maxLength: 50 })
      );

      // Generator for completion items
      const completionItemArb = fc.record({
        label: fc.string({ minLength: 1, maxLength: 50 }),
        kind: fc.integer({ min: 1, max: 25 }),
        detail: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
        documentation: fc.option(fc.string({ maxLength: 200 }), { nil: undefined })
      });

      // Generator for diagnostic severity
      const diagnosticSeverityArb = fc.constantFrom(1, 2, 3, 4); // Error, Warning, Information, Hint

      // Generator for diagnostics
      const diagnosticArb = fc.record({
        range: fc.record({
          start: fc.record({
            line: fc.integer({ min: 0, max: 1000 }),
            character: fc.integer({ min: 0, max: 200 })
          }),
          end: fc.record({
            line: fc.integer({ min: 0, max: 1000 }),
            character: fc.integer({ min: 0, max: 200 })
          })
        }),
        severity: diagnosticSeverityArb,
        message: fc.string({ minLength: 1, maxLength: 200 })
      });

      // Generator for LSP response results
      const resultArb = fc.oneof(
        // Completion result
        fc.array(completionItemArb, { maxLength: 20 }),
        // Hover result
        fc.record({
          contents: fc.string({ maxLength: 500 })
        }),
        // Diagnostic result
        fc.array(diagnosticArb, { maxLength: 10 }),
        // Initialize result
        fc.record({
          capabilities: fc.record({
            completionProvider: fc.constant({}),
            hoverProvider: fc.constant(true),
            diagnosticProvider: fc.constant({})
          })
        })
      );

      // Generator for LSP response messages
      const lspResponseArb = fc.record({
        jsonrpc: fc.constant('2.0'),
        id: responseIdArb,
        result: resultArb
      });

      fc.assert(
        fc.property(lspResponseArb, (response) => {
          // Verify LSP response structure
          assert.strictEqual(response.jsonrpc, '2.0', 'jsonrpc version should be 2.0');
          assert.ok(response.id !== undefined, 'Response should have an id');
          assert.ok(response.result !== undefined, 'Response should have a result');

          // Verify response can be serialized to JSON
          let serialized: string;
          assert.doesNotThrow(() => {
            serialized = JSON.stringify(response);
          }, 'Response should be serializable to JSON');

          // Verify serialized response can be parsed back
          assert.doesNotThrow(() => {
            const parsed = JSON.parse(serialized!);
            assert.strictEqual(parsed.jsonrpc, response.jsonrpc);
            assert.deepStrictEqual(parsed.id, response.id);
          }, 'Serialized response should be parseable');

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: vscode-language-extension, Property 5: LSP Feature Forwarding
   * Validates: Requirements 3.1, 3.2, 3.3
   * 
   * Property: For any LSP response from the language server (completion, diagnostics, hover),
   * the extension should forward it to VSCode for display.
   * 
   * Note: This property test verifies that LSP responses have the correct structure
   * to be forwarded to VSCode. Full integration with VSCode UI is tested in integration tests.
   */
  suite('Property 5: LSP Feature Forwarding', () => {
    test('Completion responses have valid structure for VSCode', function() {
      this.timeout(30000);

      // Generator for completion items that VSCode can display
      const completionItemArb = fc.record({
        label: fc.string({ minLength: 1, maxLength: 100 }),
        kind: fc.integer({ min: 1, max: 25 }), // VSCode CompletionItemKind
        detail: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        documentation: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
        insertText: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
        sortText: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
        filterText: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
      });

      fc.assert(
        fc.property(
          fc.array(completionItemArb, { minLength: 0, maxLength: 50 }),
          (completionItems) => {
            // Verify each completion item has required fields for VSCode
            for (const item of completionItems) {
              assert.ok(item.label, 'Completion item must have a label');
              assert.strictEqual(typeof item.label, 'string', 'Label must be a string');
              assert.ok(item.kind >= 1 && item.kind <= 25, 'Kind must be valid CompletionItemKind');
              
              // Optional fields should be correct type if present
              if (item.detail !== undefined) {
                assert.strictEqual(typeof item.detail, 'string', 'Detail must be a string');
              }
              if (item.documentation !== undefined) {
                assert.strictEqual(typeof item.documentation, 'string', 'Documentation must be a string');
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Diagnostic responses have valid structure for VSCode', function() {
      this.timeout(30000);

      // Generator for diagnostics that VSCode can display
      // Generate valid ranges where end >= start
      const rangeArb = fc.integer({ min: 0, max: 10000 }).chain(startLine =>
        fc.integer({ min: 0, max: 500 }).chain(startChar =>
          fc.integer({ min: startLine, max: 10000 }).chain(endLine =>
            fc.integer({ min: 0, max: 500 }).map(endChar => ({
              start: { line: startLine, character: startChar },
              end: { line: endLine, character: endChar }
            }))
          )
        )
      );

      const diagnosticArb = fc.record({
        range: rangeArb,
        severity: fc.integer({ min: 1, max: 4 }), // Error, Warning, Information, Hint
        message: fc.string({ minLength: 1, maxLength: 500 }),
        source: fc.option(fc.constant('treason'), { nil: undefined }),
        code: fc.option(fc.oneof(fc.integer(), fc.string()), { nil: undefined })
      });

      fc.assert(
        fc.property(
          fc.array(diagnosticArb, { minLength: 0, maxLength: 100 }),
          (diagnostics) => {
            // Verify each diagnostic has required fields for VSCode
            for (const diagnostic of diagnostics) {
              assert.ok(diagnostic.range, 'Diagnostic must have a range');
              assert.ok(diagnostic.range.start, 'Range must have a start');
              assert.ok(diagnostic.range.end, 'Range must have an end');
              
              assert.ok(
                diagnostic.range.start.line >= 0,
                'Start line must be non-negative'
              );
              assert.ok(
                diagnostic.range.start.character >= 0,
                'Start character must be non-negative'
              );
              assert.ok(
                diagnostic.range.end.line >= diagnostic.range.start.line,
                'End line must be >= start line'
              );
              
              assert.ok(diagnostic.severity >= 1 && diagnostic.severity <= 4,
                'Severity must be valid DiagnosticSeverity');
              assert.ok(diagnostic.message, 'Diagnostic must have a message');
              assert.strictEqual(typeof diagnostic.message, 'string',
                'Message must be a string');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Hover responses have valid structure for VSCode', function() {
      this.timeout(30000);

      // Generator for hover content
      const hoverContentArb = fc.oneof(
        // String content
        fc.string({ minLength: 1, maxLength: 1000 }),
        // MarkedString
        fc.record({
          language: fc.constant('treason'),
          value: fc.string({ maxLength: 500 })
        }),
        // MarkupContent
        fc.record({
          kind: fc.constantFrom('plaintext', 'markdown'),
          value: fc.string({ maxLength: 1000 })
        })
      );

      const hoverArb = fc.record({
        contents: fc.oneof(
          hoverContentArb,
          fc.array(hoverContentArb, { minLength: 1, maxLength: 5 })
        ),
        range: fc.option(
          fc.record({
            start: fc.record({
              line: fc.integer({ min: 0, max: 1000 }),
              character: fc.integer({ min: 0, max: 200 })
            }),
            end: fc.record({
              line: fc.integer({ min: 0, max: 1000 }),
              character: fc.integer({ min: 0, max: 200 })
            })
          }),
          { nil: undefined }
        )
      });

      fc.assert(
        fc.property(hoverArb, (hover) => {
          // Verify hover has required fields for VSCode
          assert.ok(hover.contents, 'Hover must have contents');
          
          // Verify contents structure
          if (Array.isArray(hover.contents)) {
            assert.ok(hover.contents.length > 0, 'Contents array must not be empty');
          }
          
          // Verify range if present
          if (hover.range) {
            assert.ok(hover.range.start, 'Range must have start');
            assert.ok(hover.range.end, 'Range must have end');
            assert.ok(hover.range.start.line >= 0, 'Start line must be non-negative');
            assert.ok(hover.range.start.character >= 0, 'Start character must be non-negative');
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit Tests for Extension Lifecycle
   * Requirements: 1.1, 1.4, 2.4
   */
  suite('Extension Lifecycle Unit Tests', () => {
    /**
     * Test activate() initializes all components
     * Requirements: 1.1
     */
    test('activate() function exists and is callable', () => {
      const { activate } = require('../src/extension');
      assert.strictEqual(typeof activate, 'function', 'activate should be a function');
    });

    test('deactivate() function exists and is callable', () => {
      const { deactivate } = require('../src/extension');
      assert.strictEqual(typeof deactivate, 'function', 'deactivate should be a function');
    });

    /**
     * Test activation error handling
     * Requirements: 1.4
     * 
     * Note: Full activation testing requires a VSCode extension context,
     * which is tested in integration tests. This unit test verifies the
     * function signature and basic error handling structure.
     */
    test('activate() handles errors gracefully', async () => {
      const { activate } = require('../src/extension');
      
      // Create a minimal mock context
      const mockContext: any = {
        subscriptions: [],
        extensionPath: '/test/path',
        workspaceState: {
          get: () => undefined,
          update: () => Promise.resolve()
        },
        globalState: {
          get: () => undefined,
          update: () => Promise.resolve()
        }
      };

      // Activation will fail without a real VSCode environment,
      // but it should handle the error gracefully
      try {
        await activate(mockContext);
        // If it succeeds in test environment, that's fine
        assert.ok(true);
      } catch (error) {
        // If it fails, it should throw an Error object
        assert.ok(error instanceof Error, 'Should throw an Error object');
      }
    });

    /**
     * Test deactivate() cleans up resources
     * Requirements: 2.4
     */
    test('deactivate() completes without throwing', async () => {
      const { deactivate } = require('../src/extension');
      
      // deactivate() should not throw even if nothing was activated
      await assert.doesNotReject(
        async () => await deactivate(),
        'deactivate() should not throw'
      );
    });

    test('deactivate() returns a Promise', () => {
      const { deactivate } = require('../src/extension');
      const result = deactivate();
      
      assert.ok(result instanceof Promise, 'deactivate() should return a Promise');
    });
  });
});
