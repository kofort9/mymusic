export class Logger {
  private static logs: string[] = [];
  private static MAX_LOGS = 20;

  private static getTimestamp(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  static log(message: string) {
    const timestamp = this.getTimestamp();
    this.logs.push(`[${timestamp}] INFO: ${message}`);
    if (this.logs.length > this.MAX_LOGS) this.logs.shift();
  }

  static error(message: string, error?: unknown) {
    const timestamp = this.getTimestamp();
    // If error is passed, append its message if it wasn't already included in the message string
    let errStr = '';
    if (error && typeof error === 'object') {
      const err = error as { message?: string };
      if (err.message && !message.includes(err.message)) {
        errStr = ` | ${err.message}`;
      }
    }

    this.logs.push(`[${timestamp}] ERROR: ${message}${errStr}`);
    if (this.logs.length > this.MAX_LOGS) this.logs.shift();
  }

  static getLogs(): string[] {
    return this.logs;
  }
}
