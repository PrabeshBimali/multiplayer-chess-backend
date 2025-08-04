import { NextFunction, Request, Response } from "express";
import { InvalidParameterError } from "../errors/redisCacheErrors.js";
import redisClient from "../config/redisClient.js";

export async function APIRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip

    if(!ip) {
      throw new InvalidParameterError("ip")
    }

    const key = `apilock:ip:${ip}`

    const doesKeyExist = await redisClient.exists(key)

    if(doesKeyExist !== 1) {
      await redisClient.incr(key)
      await redisClient.expire(key, 60, "NX")
      next()
      return
    }

    const countStr = await redisClient.get(key)
    const count = Number(countStr)

    if(count > 5) {
      res.status(429).send()
      return
    }

    await redisClient.incr(key)
    next()
  } catch(e) {
    console.error(e)
  }
} 