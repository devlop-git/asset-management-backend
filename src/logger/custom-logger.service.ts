import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CustomLogger extends ConsoleLogger {
  private readonly ignoredContexts = [
    'RouterExplorer',
    'RoutesResolver',
    // 'InstanceLoader', // uncomment if you also want to remove dependency init logs
  ];

  private shouldIgnore(context?: string): boolean {
    return !!context && this.ignoredContexts.includes(context);
  }

  // Separate log files
  private infoLogFile = path.join(__dirname, '../../logs/app.log');
  private errorLogFile = path.join(__dirname, '../../logs/error.log');

  private writeToFile(filePath: string, message: string) {
    fs.appendFileSync(filePath, message + '\n');
  }

  log(message: string, context?: string) {
    if (this.shouldIgnore(context)) return;
    super.log(message, context);
    this.writeToFile(
      this.infoLogFile,
      `[LOG] ${new Date().toISOString()}${context ? ' [' + context + ']' : ''} - ${message}`,
    );
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.writeToFile(
      this.infoLogFile,
      `[WARN] ${new Date().toISOString()}${context ? ' [' + context + ']' : ''} - ${message}`,
    );
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile(
      this.errorLogFile,
      `[ERROR] ${new Date().toISOString()}${context ? ' [' + context + ']' : ''} - ${message} - ${trace || ''}`,
    );
  }
}
