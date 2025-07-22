import { createClient, RedisClientType } from 'redis';

const redisClient: RedisClientType = createClient();

redisClient.on('error', err => console.log('Redis Client Error', err));

await redisClient.connect();
export default redisClient