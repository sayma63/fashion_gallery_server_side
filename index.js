const express=require("express");
const cors=require('cors');
const app= express();
const port=process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
// const { ObjectID } = require('bson');
//middle wares
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cnkfgua.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run(){

    try{
        const productCollection=client.db('fashion_gallery').collection('products');
        const orderCollection= client.db('fashion_gallery').collection('orders');
        const usersCollection= client.db('fashion_gallery').collection('users');
        










           //All products api
        app.get('/products', async(req,res)=>{
            const query={}
            const cursor=productCollection.find(query);
            const products= await cursor.toArray();
            res.send(products);
           });
         //single product details api
         app.get('/products/:id', async(req,res) => {
            const id = req.params.id;
            
            const query = {_id: new ObjectId(id)};
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        //orders api
        app.post('/orders', async (req,res)=>{
            const order =req.body;
            const result= await orderCollection.insertOne(order)
            res.send(result);
        });
        //specific user order
        app.get('/orders',async (req, res) => {
            const email = req.query.email;
            const query={email:email};
            const orders= await orderCollection.find(query).toArray();
            res.send(orders);
            });

            // creat users api
            app.post('/users', async(req,res)=>{
                const user=req.body;
                const result= await usersCollection.insertOne(user);
                res.send(result);
            })

            



    }
    finally{

    }

}
run().catch(error=>console.error(err))


app.get('/',(req,res)=>{
    res.send("fashion gallery server Running");
})
app.listen(port,()=>{
    console.log(`Fashion gallery server running on ${port}`);
})

