const express = require('express');
const fs = require('fs');
require('dotenv').config();
const csv = require('csv-parser');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const { MongoClient, ServerApiVersion } = require('mongodb');
const { url } = require('inspector');
const connectionString = process.env.ATLAS_URI || "";


let db;
async function connect(){
  const client = new MongoClient(connectionString);

  let conn;
try {
  conn = await client.connect();
} catch(e) {
  console.error(e);
}
if(conn){
  console.log('hello');
  db = conn.db("foodItemsAPI");
}





    // console.log(results)
//  return collection;

}
connect()




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
    servers: [{
      url :'http://localhost:3000/'

    },
  {
    url:'https://fooditemsapi.onrender.com/',
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
    },
  },
  // Path to the API routes files
  apis: ['./index.js'],
  
  
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

var foodItems = [];
var orders = [];
var a = 0;


const app = express();




app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // maximum of 10 requests per minute
});

app.use(limiter);

const JWT_SECRET = 'your-secret-key';
const JWT_EXPIRATION = '1h';

function authorizationMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(authHeader)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];


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


app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Perform authentication logic here, e.g., validate username and password
  console.log(username)
  if (username === 'admin' && password === 'password') {
    const accessToken = generateAccessToken(username);
    res.json({ accessToken: accessToken });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});


/**
 * @swagger
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
 * /login:
 *   post:
 *     summary: Authenticate user and generate access token
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
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error

 */


app.get('/foodItems', authorizationMiddleware, async (req, res) => {
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;

  let collection = await db.collection("foodItems");
  
  // Retrieve paginated food items from MongoDB
  const foodItems = await collection.find()
  .sort({ _id: 1 })
    .skip(startIndex)
    .limit(limit)
    .toArray();

  const totalItems = await collection.countDocuments();

  res.json({
    page: page,
    limit: limit,
    totalItems: foodItems.length,
    totalPages: Math.ceil(foodItems.length / limit),
    data: foodItems,
  });
});

app.get('/foodItems/:id', authorizationMiddleware, async (req, res) => {
  const itemId = parseInt(req.params.id);
  let collection = await db.collection("order");

  // Find a food item by ID from MongoDB
  const item = await collection.findOne({ _id: itemId });

  if (item) {
    res.json(item);
  } else {
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
  let collection = await db.collection("order");
  const order = await collection.findOne({ _id: id });
  if (order) {
    res.status(200).json(order);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
});


app.listen(3000, () => {
  console.log('Food Items API server is running on port 3000');
});
