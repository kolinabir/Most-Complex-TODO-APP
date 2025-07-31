/**
 * TodoLang Error Reporter and Debugging Tools
 *
 * Comprehensive error reporting and debugging utilities for TodoLang development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TodoLangErrorReporter {
  constructor(options = {}) {
    this.options = {
      enableConsoleOutput: true,
      enableFileLogging: true,
      enableSourceMapping: true,
      logDirectory: path.join(process.cwd(), 'logs'),
      maxLogFiles: 10,
      enableStackTrace: true,
      enableContextLines: true,
      contextLineCount: 3,
      ...options
    };

    this.errorLog = [];
    this.warningLog = [];
    this.debugLog = [];

    this.initializeLogging();
  }

  initializeLogging() {
    if (this.options.enableFileLogging) {
      // Ensure log directory exists
      if (!fs.existsSync(this.options.logDirectory)) {
        fs.mkdirSync(this.options.logDirectory, { recursive: true });
      }

      // Clean up old log files
      this.cleanupOldLogs();
    }
  }

  /**
   * Report a compilation error with detailed context
   */
  reportCompilationError(error, sourceCode, filePath) {
    const errorReport = {
      type: 'compilation',
      timestamp: new Date().toISOString(),
      file: filePath,
      error: {
        name: error.name || 'CompilationError',
        message: error.message,
        stack: this.options.enableStackTrace ? error.stack : null
      },
      location: error.location || null,
      context: this.options.enableContextLines ? this.extractContext(sourceCode, error.location) : null,
      sourceMapping: this.options.enableSourceMapping ? this.generateSourceMapping(error, sourceCode) : null
    };

    this.errorLog.push(errorReport);

    if (this.options.enableConsoleOutput) {
      this.printCompilationError(errorReport);
    }

    if (this.options.enableFileLogging) {
      this.writeErrorToFile(errorReport);
    }

    return errorReport;
  }

  /**
   * Report a runtime error with execution context
   */
  reportRuntimeError(error, executionContext = {}) {
    const errorReport = {
      type: 'runtime',
      timestamp: new Date().toISOString(),
      error: {
        name: error.name || 'RuntimeError',
        message: error.message,
        stack: this.options.enableStackTrace ? error.stack : null
      },
      executionContext: {
        component: executionContext.component || null,
        method: executionContext.method || null,
        state: executionContext.state || null,
        props: executionContext.props || null
      },
      browserInfo: typeof window !== 'undefined' ? {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      } : null
    };

    this.errorLog.push(errorReport);

    if (this.options.enableConsoleOutput) {
      this.printRuntimeError(errorReport);
    }

    if (this.options.enableFileLogging) {
      this.writeErrorToFile(errorReport);
    }

    return errorReport;
  }

  /**
   * Report a warning with context
   */
  reportWarning(message, context = {}) {
    const warningReport = {
      type: 'warning',
      timestamp: new Date().toISOString(),
      message,
      context,
      file: context.file || null,
      location: context.location || null
    };

    this.warningLog.push(warningReport);

    if (this.options.enableConsoleOutput) {
      this.printWarning(warningReport);
    }

    if (this.options.enableFileLogging) {
      this.writeWarningToFile(warningReport);
    }

    return warningReport;
  }

  /**
   * Log debug information
   */
  debug(message, data = {}) {
    const debugEntry = {
      type: 'debug',
      timestamp: new Date().toISOString(),
      message,
      data
    };

    this.debugLog.push(debugEntry);

    if (this.options.enableConsoleOutput && process.env.NODE_ENV === 'development') {
      console.debug(`🐛 [TodoLang Debug] ${message}`, data);
    }

    if (this.options.enableFileLogging) {
      this.writeDebugToFile(debugEntry);
    }
  }

  /**
   * Extract source code context around an error location
   */
  extractContext(sourceCode, location) {
    if (!location || !sourceCode) {
      return null;
    }

    const lines = sourceCode.split('\n');
    const errorLine = location.line - 1; // Convert to 0-based index
    const startLine = Math.max(0, errorLine - this.options.contextLineCount);
    const endLine = Math.min(lines.length - 1, errorLine + this.options.contextLineCount);

    const contextLines = [];

    for (let i = startLine; i <= endLine; i++) {
      contextLines.push({
        lineNumber: i + 1,
        content: lines[i] || '',
        isErrorLine: i === errorLine,
        column: i === errorLine ? location.column : null
      });
    }

    return {
      startLine: startLine + 1,
      endLine: endLine + 1,
      lines: contextLines
    };
  }

  /**
   * Generate source mapping information for errors
   */
  generateSourceMapping(error, sourceCode) {
    if (!error.location || !sourceCode) {
      return null;
    }

    const lines = sourceCode.split('\n');
    const errorLine = lines[error.location.line - 1];

    return {
      originalLine: error.location.line,
      originalColumn: error.location.column,
      originalSource: errorLine,
      tokenLength: this.estimateTokenLength(errorLine, error.location.column),
      suggestions: this.generateErrorSuggestions(error, errorLine)
    };
  }

  /**
   * Estimate the length of the token causing the error
   */
  estimateTokenLength(line, column) {
    if (!line || column < 1) return 1;

    const startIndex = column - 1;
    let endIndex = startIndex;

    // Find the end of the current token
    while (endIndex < line.length && /\w/.test(line[endIndex])) {
      endIndex++;
    }

    return Math.max(1, endIndex - startIndex);
  }

  /**
   * Generate helpful suggestions for common errors
   */
  generateErrorSuggestions(error, sourceLine) {
    const suggestions = [];
    const message = error.message.toLowerCase();

    if (message.includes('unexpected token')) {
      suggestions.push('Check for missing semicolons, brackets, or quotes');
      suggestions.push('Verify that all opening brackets have matching closing brackets');
    }

    if (message.includes('unterminated string')) {
      suggestions.push('Check for missing closing quotes in string literals');
      suggestions.push('Ensure string quotes are properly escaped');
    }

    if (message.includes('expected')) {
      suggestions.push('Check the syntax around this location');
      suggestions.push('Refer to the TodoLang grammar documentation');
    }

    if (message.includes('undefined')) {
      suggestions.push('Check if the variable or function is properly declared');
      suggestions.push('Verify import statements and module dependencies');
    }

    return suggestions;
  }

  /**
   * Print compilation error to console with formatting
   */
  printCompilationError(errorReport) {
    console.error('\n❌ TodoLang Compilation Error');
    console.error('='.repeat(50));
    console.error(`File: ${errorReport.file}`);
    console.error(`Error: ${errorReport.error.message}`);

    if (errorReport.location) {
      console.error(`Location: Line ${errorReport.location.line}, Column ${errorReport.location.column}`);
    }

    if (errorReport.context) {
      console.error('\nContext:');
      for (const line of errorReport.context.lines) {
        const prefix = line.isErrorLine ? '>>> ' : '    ';
        const lineNum = line.lineNumber.toString().padStart(3, ' ');
        console.error(`${prefix}${lineNum} | ${line.content}`);

        if (line.isErrorLine && line.column) {
          const pointer = ' '.repeat(prefix.length + 5 + line.column - 1) + '^';
          console.error(pointer);
        }
      }
    }

    if (errorReport.sourceMapping && errorReport.sourceMapping.suggestions.length > 0) {
      console.error('\nSuggestions:');
      for (const suggestion of errorReport.sourceMapping.suggestions) {
        console.error(`  • ${suggestion}`);
      }
    }

    if (errorReport.error.stack && this.options.enableStackTrace) {
      console.error('\nStack Trace:');
      console.error(errorReport.error.stack);
    }

    console.error('='.repeat(50));
  }

  /**
   * Print runtime error to console with formatting
   */
  printRuntimeError(errorReport) {
    console.error('\n🚨 TodoLang Runtime Error');
    console.error('='.repeat(50));
    console.error(`Error: ${errorReport.error.message}`);

    if (errorReport.executionContext.component) {
      console.error(`Component: ${errorReport.executionContext.component}`);
    }

    if (errorReport.executionContext.method) {
      console.error(`Method: ${errorReport.executionContext.method}`);
    }

    if (errorReport.executionContext.state) {
      console.error('State:', JSON.stringify(errorReport.executionContext.state, null, 2));
    }

    if (errorReport.browserInfo) {
      console.error(`URL: ${errorReport.browserInfo.url}`);
    }

    if (errorReport.error.stack && this.options.enableStackTrace) {
      console.error('\nStack Trace:');
      console.error(errorReport.error.stack);
    }

    console.error('='.repeat(50));
  }

  /**
   * Print warning to console with formatting
   */
  printWarning(warningReport) {
    console.warn(`⚠️  [TodoLang Warning] ${warningReport.message}`);

    if (warningReport.file) {
      console.warn(`   File: ${warningReport.file}`);
    }

    if (warningReport.location) {
      console.warn(`   Location: Line ${warningReport.location.line}, Column ${warningReport.location.column}`);
    }
  }

  /**
   * Write error to log file
   */
  writeErrorToFile(errorReport) {
    const logFile = path.join(this.options.logDirectory, `todolang-errors-${this.getDateString()}.log`);
    const logEntry = `${errorReport.timestamp} [ERROR] ${JSON.stringify(errorReport, null, 2)}\n\n`;

    fs.appendFileSync(logFile, logEntry);
  }

  /**
   * Write warning to log file
   */
  writeWarningToFile(warningReport) {
    const logFile = path.join(this.options.logDirectory, `todolang-warnings-${this.getDateString()}.log`);
    const logEntry = `${warningReport.timestamp} [WARNING] ${JSON.stringify(warningReport, null, 2)}\n\n`;

    fs.appendFileSync(logFile, logEntry);
  }

  /**
   * Write debug info to log file
   */
  writeDebugToFile(debugEntry) {
    const logFile = path.join(this.options.logDirectory, `todolang-debug-${this.getDateString()}.log`);
    const logEntry = `${debugEntry.timestamp} [DEBUG] ${debugEntry.message} ${JSON.stringify(debugEntry.data)}\n`;

    fs.appendFileSync(logFile, logEntry);
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.errorLog.length,
        totalWarnings: this.warningLog.length,
        totalDebugEntries: this.debugLog.length
      },
      errors: this.errorLog,
      warnings: this.warningLog,
      debugEntries: this.debugLog.slice(-100), // Last 100 debug entries
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd(),
        argv: process.argv
      }
    };

    return report;
  }

  /**
   * Export error report to file
   */
  exportErrorReport(filePath) {
    const report = this.generateErrorReport();
    const reportPath = filePath || path.join(this.options.logDirectory, `error-report-${Date.now()}.json`);

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📋 Error report exported to: ${reportPath}`);
    return reportPath;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.errorLog = [];
    this.warningLog = [];
    this.debugLog = [];
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentErrors = this.errorLog.filter(error =>
      new Date(error.timestamp).getTime() > oneHourAgo
    );

    const recentWarnings = this.warningLog.filter(warning =>
      new Date(warning.timestamp).getTime() > oneHourAgo
    );

    return {
      total: {
        errors: this.errorLog.length,
        warnings: this.warningLog.length,
        debugEntries: this.debugLog.length
      },
      recent: {
        errors: recentErrors.length,
        warnings: recentWarnings.length
      },
      errorTypes: this.getErrorTypeBreakdown(),
      mostCommonErrors: this.getMostCommonErrors()
    };
  }

  /**
   * Get breakdown of error types
   */
  getErrorTypeBreakdown() {
    const breakdown = {};

    for (const error of this.errorLog) {
      const type = error.type || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Get most common error messages
   */
  getMostCommonErrors() {
    const errorCounts = {};

    for (const error of this.errorLog) {
      const message = error.error.message;
      errorCounts[message] = (errorCounts[message] || 0) + 1;
    }

    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
  }

  /**
   * Clean up old log files
   */
  cleanupOldLogs() {
    try {
      const logFiles = fs.readdirSync(this.options.logDirectory)
        .filter(file => file.startsWith('todolang-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.options.logDirectory, file),
          mtime: fs.statSync(path.join(this.options.logDirectory, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // Keep only the most recent log files
      if (logFiles.length > this.options.maxLogFiles) {
        const filesToDelete = logFiles.slice(this.options.maxLogFiles);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Get date string for log file names
   */
  getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
}

// Create a global error reporter instance
export const globalErrorReporter = new TodoLangErrorReporter();

// Export convenience functions
export function reportCompilationError(error, sourceCode, filePath) {
  return globalErrorReporter.reportCompilationError(error, sourceCode, filePath);
}

export function reportRuntimeError(error, executionContext) {
  return globalErrorReporter.reportRuntimeError(error, executionContext);
}

export function reportWarning(message, context) {
  return globalErrorReporter.reportWarning(message, context);
}

export function debug(message, data) {
  return globalErrorReporter.debug(message, data);
}