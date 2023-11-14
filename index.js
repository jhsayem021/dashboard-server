const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const { query } = require('express');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 8000;

// Middleware

app.use(cors());
app.use(express.json());

// MongoDB connection


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sezawpu.mongodb.net/?retryWrites=true&w=majority`;

// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {

    // console.log('token', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })
}


async function run() {

    try {
        
  
        // Broadband database
        const usersCollection = client.db("broadband").collection("users");


        const customersCollection = client.db("broadband").collection("customers");
        const datePaymentCollection = client.db("broadband").collection("customers-payment");
        const expenseCollection = client.db("broadband").collection("expense");

        const verifyAdmin = async (req, res, next) => {
            console.log(req.decoded.email)
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            console.log(users);
            res.send(users);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })
        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {

            const id = req.params.id;

            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin',
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result);
        })

        // update customer payment
        app.put('/updatepayments', async (req, res) => {

            const updateCustomerPayment = req.body;

            console.log();
            const id = updateCustomerPayment.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {

                    amount: updateCustomerPayment.amount,
                    date: updateCustomerPayment.date,
                    status: updateCustomerPayment.status
                }
            }
            const result = await customersCollection.updateOne(filter, updateDoc, options)
            res.send(result);
        })

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })



        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10h' });
                // console.log(token);
                return res.send({ accessToken: token })

            }
            res.status(403).send({ accessToken: 'access_token' })

        })

        app.post('/users', async (req, res) => {

            const user = req.body;
            console.log(user)
            const result = await usersCollection.insertOne(user);
            res.send(result);

        })

        app.post('/expense', async (req, res) => {

            const expense = req.body;
            console.log(expense)
            const result = await expenseCollection.insertOne(expense);
            res.send(result);

        })
        // Get all Customer data
        app.get('/allexpense', async (req, res) => {
            const query = {}
            const allExpense = await expenseCollection.find(query).toArray();
            res.send(allExpense);
        })

        app.post('/updatepaymentsdate', async (req, res) => {

            const customerPayment = req.body;
            console.log(customerPayment)
            const result = await datePaymentCollection.insertOne(customerPayment);
            res.send(result);

        })

        app.get('/customerPayment', async (req, res) => {
            const query = {}
            const customerPayment = await datePaymentCollection.find(query).toArray();

            res.send(customerPayment);
        })


        // Get all Customer data
        app.get('/customers', async (req, res) => {
            const query = {}
            const customers = await customersCollection.find(query).toArray();
            res.send(customers);
        })


        // customer add api
        app.post('/customer', verifyJWT, verifyAdmin, async (req, res) => {
            const customer = req.body;
            const result = await customersCollection.insertOne(customer);
            res.send(result);
        })


        // Delete a single Customer
        app.delete('/customer/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) };
            const result = await customersCollection.deleteOne(filter);
            res.send(result);
        })

    }
    finally {

    }

}
run().catch(console.log);



// Default route
app.get('/', async (req, res) => {
    res.send('New Line Broadband Running')
})





// Listen
app.listen(port, () => {
    console.log(`Server is running ${port}`);
})