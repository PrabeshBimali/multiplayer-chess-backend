import { createClient, RedisClientType } from 'redis';

const client: RedisClientType = createClient();

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();
export default client