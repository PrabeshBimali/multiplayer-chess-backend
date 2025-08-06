import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv'

if(process.env.NODE_ENV === "development") {
  const dotenvResult = dotenv.config()
  
  if(dotenvResult.error) {
    throw dotenvResult.error
  }
}
const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', err => console.log('Redis Client Error', err));

await redisClient.connect();
export default redisClient