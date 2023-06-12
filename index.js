const express = require('express');
const fs = require('fs');
const axios = require('axios');
const { auth,requiresAuth } = require('express-openid-connect');
require('dotenv').config();
const csv = require('csv-parser');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const { createClient } = require('redis');

const { MongoClient, ServerApiVersion } = require('mongodb');
const { resourceUsage } = require('process');
const RedisClient = createClient({
  url:process.env.REDIS
});
 RedisClient.connect();
RedisClient.on('error', err => console.log('Redis Client Error', err));
RedisClient.on('connect', () => {
  console.log('Redis client connected');
});







const connectionString = process.env.ATLAS_URI || "";
let db;

async function connect() {
  const client = new MongoClient(connectionString);

  let conn;
  try {
    conn = await client.connect();
  } catch (e) {
    console.error(e);
  }
  if (conn) {
    console.log('Connected to MongoDB');
    db = conn.db('foodItemsAPI');
   
  }
}

connect();



const swaggerOptions = {
  definition: {
    // Information about the API
    openapi: '3.0.0',
    info: {
      title: 'Food Items API',
      description: 'API for managing food items',
      version: '1.0.0',
    },
    // Base path for API endpoints
    servers: [
  {
    url:'https://fooditemsapi.onrender.com/',
  },
  {
    url:'http://localhost:3000/',
  }
]
    ,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      xSummary: '[Authorize](https://example.com/authorize) - Test authorization by clicking the link and providing a valid JWT token.',
    
    },
  },
 
  apis: ['./index.js'],
  
  
};


const swaggerSpec = swaggerJSDoc(swaggerOptions);




const app = express();





app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const limiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
});
function isTokenExpired(expiration) {
  const now = Date.now() / 1000; 
  return expiration < now;
}

app.use(limiter);



const JWT_SECRET = process.env.JWTSECRET;
const JWT_EXPIRATION = '1hr';

function authorizationMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  // console.log(authHeader)

  if (!authHeader ) {
    return res.status(401).json({ message: 'Invalid authorization header' });
  }

  const token = authHeader.split(' ')[1]
  console.log(token)


  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
function generateAccessToken(username) {
  return jwt.sign({ username: username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}
app.post('/generatetoken', async (req, res) => {
  console.log('hiii')
  const username = req.body.username;
  console.log(username)

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  const existingToken = await db.collection('tokens').findOne({ username });

  if (existingToken && !isTokenExpired(existingToken.expiration)) {
 
    res.json({ accessToken: existingToken.token });
  } else {
    const token = generateAccessToken(username);
    const expiration = (Date.now() / 1000) + 3600; // Set token expiration to 1 hour from now

    await db.collection('tokens').updateOne(
      { username },
      { $set: { token, expiration } },
      { upsert: true }
    );

    res.json({ accessToken: token });
  }
});
app.get('/profile',(req,res)=>{
  console.log(req.oidc.user)
    res.send(req.oidc.user)
})



async function redisMiddleWare (req,res,next){

  const key= req.url;
 

  await RedisClient.get(key).then(async (result)=>{
    if(result){
      console.log('cache Hit')
      res.status(200).send(JSON.parse(result))
    }
    else{
      console.log('cache miss')
      next();
    }
  })
}










/**
 * @swagger
 * /generatetoken:
 *   post:
 *     summary: Generate access token for authentication
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *             required:
 *               - username
 *     responses:
 *       200:
 *         description: Access token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Username is required
 *       500:
 *         description: Server error
 * 
 * 
 * tags:
 *   name: Food Items
 *   description: API for managing food items
 * /foodItems:
 *   get:
 *     summary: Get paginated food items
 *     tags: [Food Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of food items
 *         content:
 *           application/json:
 *             schema:
 *               
 *       401:
 *         description: Invalid authorization header or token
 *       500:
 *         description: Server error
 *
 * /foodItems/{id}:
 *   get:
 *     summary: Get a food item by ID
 *     tags: [Food Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the food item
 *     responses:
 *       200:
 *         description: The requested food item
 *         content:
 *           application/json:
 *             schema:
 *               
 *       401:
 *         description: Invalid authorization header or token
 *       404:
 *         description: Food item not found
 *       500:
 *         description: Server error
 *
 * /addOrder:
 *   post:
 *     summary: Place an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *               quantity:
 *                 type: string
 *             required:
 *               - itemId
 *               - quantity
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       401:
 *         description: Invalid authorization header or token
 *       404:
 *         description: Food item not found
 *       500:
 *         description: Server error
 *
 * /order/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the order
 *     responses:
 *       200:
 *         description: The requested order
 *         content:
 *           application/json:
 *             schema:
 *               
 *       401:
 *         description: Invalid authorization header or token
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 * 
 */


app.get('/foodItems', authorizationMiddleware, async (req, res) => {
  try
  {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    console.log(page,limit)
    const key=req.url;
    let collection = await db.collection("foodItems");
    const foodItems=[];
    for(let i=startIndex;i<startIndex+limit;i++){
      const key=  `foodItems/${i}`;
 

      const result= await RedisClient.get(key)
        if(result){
          console.log('cache Hit')
         foodItems.push(JSON.parse(result))
        }
        else{
          console.log('cache miss')
          const item=await collection.findOne({_id:i});
          RedisClient.set(key, JSON.stringify(item));
          foodItems.push(item)
         
        }
    

    
  }
 
   
   
    
  
    const totalItems = await collection.countDocuments();
    console.log(totalItems)
    const responseObj={
      page: page,
      limit: limit,
      totalItems: totalItems.length,
      totalPages: Math.ceil(totalItems.length / limit),
      data: foodItems,
    }
    
    res.json(responseObj);


  }
  catch (error){
    console.error(error)
  }
 
});

app.get('/foodItems/:id', authorizationMiddleware, async (req, res) => {
  const itemId = parseInt(req.params.id);
  let collection = await db.collection("foodItems");

  const key=  `foodItems/${itemId}`;
 
  let item;
  const result= await RedisClient.get(key)
    if(result){
      item=result
      console.log('cache Hit')
     res.status(200).json(JSON.parse(result))
    }
    else{
      console.log('cache miss')
       item=await collection.findOne({_id:itemId});
      RedisClient.set(key, JSON.stringify(item));
      res.status(200).json(item)
     
    }


 

  if (!item){
    res.status(404).json({ message: 'Food item not found' });
  }
});

app.post('/addOrder', authorizationMiddleware,async (req, res) => {
  const itemId = parseInt(req.body.itemId);
  const quantity = parseInt(req.body.quantity);

  let collection = await db?.collection("foodItems");
  const item = await collection.findOne({ _id: itemId });
  console.log(req.body.itemId)
  if (item) {
    const order = {
      _id: await db.collection('order').count() + 1,
      itemId: itemId,
      quantity: quantity,
    };

    let result = await db.collection('order').insertOne(order);
    if(result){
      res.status(201).json({ message: 'Order placed successfully',order:{...order}  });

    }
    else{
      res.status(400).json({ message: 'error placing order' });

    }

   
  } else {
    res.status(404).json({ message: 'Food item not found' });
  }
});

app.get('/order/:id', authorizationMiddleware, async(req, res) => {
  const id = parseInt(req.params.id);
  const key=`orders/${id}`
  let collection = await db.collection("order");
  
  const result= await RedisClient.get(key)
  if(result){
    console.log('cache hit')
    res.status(200).json(JSON.parse(result))
  }
  else{
    console.log('cache miss')
    const order = await collection.findOne({ _id: id });
    if (order) {
      await RedisClient.set(key, JSON.stringify(order));
      res.status(200).json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }

  }

 
 
});


app.listen(3000, () => {
  console.log('Food Items API server is running on port 3000');
});
