const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb+srv://dhruvpatelbe_db_user:aFcGMzFdOJMSbjhm@cluster0.cylrsqz.mongodb.net/restaurant_db?appName=Cluster0';

console.log('Connecting to:', uri);
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected successfully to DB');
    const db = client.db('restaurant_db');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await client.close();
  }
}
run();
