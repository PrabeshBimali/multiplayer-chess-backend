export abstract class ChessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace (only needed when targeting ES5)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ChessClientError extends ChessError {
  constructor(msg: string) {
    super(msg);
  }
}