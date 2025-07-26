export abstract class RedisCacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace (only needed when targeting ES5)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class InvalidParameterError extends RedisCacheError {
  constructor(parameterName: string) {
    super(`Invalid parameter provided: ${parameterName}`);
  }
}

// Cache operation failures
export class CacheSetError extends RedisCacheError {
  constructor(key: string) {
    super(`Failed to set value in cache for key: ${key}`);
  }
}

export class CacheGetError extends RedisCacheError {
  constructor(key: string) {
    super(`Failed to get value from cache for key: ${key}`);
  }
}

export class CacheDeleteError extends RedisCacheError {
  constructor(key: string) {
    super(`Failed to delete value from cache for key: ${key}`);
  }
}

// Not found errors
export class CacheGameNotFoundError extends RedisCacheError {
  constructor(gameId: string) {
    super(`Game not found in cache: ${gameId}`);
  }
}

export class CachePlayerNotFoundError extends RedisCacheError {
  constructor(playerId: string) {
    super(`Player not found in cache: ${playerId}`);
  }
}

export class CacheGameStateNotFoundError extends RedisCacheError {
  constructor(gameId: string) {
    super(`Game state not found in cache: ${gameId}`);
  }
}