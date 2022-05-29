const express = require('express');
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)




// middleware
app.use(cors())
app.use(express.json())
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vhj24zl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        console.log('DB Connected');
        const productCollection = client.db('lowell-parts').collection('products');
        const orderCollection = client.db('lowell-parts').collection('orders');
        const userCollection = client.db('lowell-parts').collection('users');
        const reviewCollection = client.db('lowell-parts').collection('reviews');
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = await productCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/product/:id', async (req, res) => {
            const productId = req.params.id;
            const query = { _id: ObjectId(productId) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });


        app.post('/create-payment-intent', async (req, res) => {
            const order = await req.body;
            const amount = await order.totalCost;
            // console.log(amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: parseInt(amount),
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.post('/order', async (req, res) => {
            const product = req.body;
            const result = await orderCollection.insertOne(product);
            res.send(result);
        });

        app.put('/getPayment/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            }

            const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
            res.send(updatedOrder);
        })

        app.delete('/deleteOrder/:id', async (req, res) => {
            const orderId = req.params.id;
            const filter = { _id: ObjectId(orderId) };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/order/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const order = await orderCollection.find(filter).toArray();
            res.send(order.reverse());
        });

        app.get('/order', async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders.reverse());
        })

        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const order = await orderCollection.findOne(filter);
            res.send(order);
        });


        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin })
        });

        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = await userCollection.findOne({ email: email });
            console.log(filter)
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });



        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });


        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = await userCollection.findOne(filter);

            res.send(user);
        });

        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });
        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = await reviewCollection.find(query);
            const result = await cursor.toArray();
            res.send(result.reverse());
        })


    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})

