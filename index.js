const express=require("express");
const cors=require('cors');
const app= express();
const jwt = require('jsonwebtoken');
const port=process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
// const { ObjectID } = require('bson');
//middle wares
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cnkfgua.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req,res,next){
    const authHeader=req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message:'unauthorized'})
    }
    const token=authHeader.split(' ')[1];
    console.log('token',token)
    jwt.verify(token,process.env.ACCESS_TOKEN,function(err, decoded) {
        if(err){
            return res.status(403).send({message:'forbidden access'})
        }
        req.decoded=decoded;
        next();
      });
};
async function run(){

    try{
        const productCollection=client.db('fashion_gallery').collection('products');
        const orderCollection= client.db('fashion_gallery').collection('orders');
        const usersCollection= client.db('fashion_gallery').collection('users');
        const paymentsCollection= client.db('fashion_gallery').collection('payments');
        







        

           //All products api
        app.get('/products', async(req,res)=>{
            const query={}
            const cursor=productCollection.find(query);
            const products= await cursor.toArray();
            res.send(products);
           });
           //verify admin
           const verifyAdmin=async(req,res,next)=>{
            
            const decodedEmail= req.decoded.email;
            const query= {email: decodedEmail}
            const user= await usersCollection.findOne(query);
            if(user?.role!=='admin'){
                return res.status(403).send({message:'forbidden access'})
            }
            next();  
        }

         //single product details api
         app.get('/products/:id', async(req,res) => {
            const id = req.params.id;
            
            const query = {_id: new ObjectId(id)};
            const product = await productCollection.findOne(query);
            res.send(product);
        });
               //add product
        app.post('/products', verifyJWT,verifyAdmin, async (req, res) => {
            const newProduct = req.body;

            const result = await productCollection.insertOne(newProduct);
            res.send(result)
        });
        //all product
        app.get('/products', verifyJWT,verifyAdmin, async (req, res) => {
            const query = {};
           const result = await productCollection.find(query).toArray();
            res.send(result);
        });
         //delete product
         app.delete('/products/:id',verifyJWT,verifyAdmin, async(req,res)=>{
            const id=req.params.id;
            const filter = {_id: new ObjectId(id)};
            const result=await productCollection.deleteOne(filter);
            return res.send(result)


        })

        //orders api
        app.post('/orders', async (req,res)=>{
            const order =req.body;
            const result= await orderCollection.insertOne(order)
            res.send(result);
        });
        app.get('/orders/:id', async(req,res)=>{
            const id= req.params.id;
            const query = {_id: new ObjectId(id)};
            const order= await orderCollection.findOne(query);
            res.send(order);


        })
        //specific user order
        app.get('/orders', verifyJWT,async (req, res) => {
            const email = req.query.email;
            const decodedEmail=req.decoded.email;
            if(email!==decodedEmail){
                return res.status(403).send({message:"forbidden access"})

            }
            const query={email:email};
            const orders= await orderCollection.find(query).toArray();
            res.send(orders);
            });
            app.get('/jwt', async(req,res)=>{
                const email=req.query.email;
                const query={email:email};
                const user= await usersCollection.findOne(query);
                if(user){
                    const token=jwt.sign({email},process.env.ACCESS_TOKEN,{expiresIn:60 * 60})
                    return res.send({accessToken: token})
                }
                
                res.status(403).send({accessToken:""});

            });
            //get all order
            app.get('/order', async (req, res) => {
                const query = {};
                const cursor = orderCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
    
            });
            // is particular user admin
            app.get("/users/admin/:email", async(req,res)=>{
                const email = req.params.email;
                const query={email: email};
                const user = await usersCollection.findOne(query);
                res.send({isAdmin: user?.role === 'admin'});
            })

            // creat users api
            app.post('/users', async(req,res)=>{
                const user=req.body;
                const result= await usersCollection.insertOne(user);
                res.send(result);
            });
            //all users api
            app.get('/users', async(req,res)=>{
                const query= {};
                const users= await usersCollection.find(query).toArray();
                res.send(users);
            });
            //make admin api
            app.put('/users/admin/:id', verifyJWT,verifyAdmin, async(req,res)=>{
                
                const id = req.params.id;
                const filter=  {_id: new ObjectId(id)};
                const options= {upsert : true};
                const updatedDoc ={
                    $set:{
                        role:'admin'
                    }
                }
                const result= await usersCollection.updateOne(filter,updatedDoc,options);
                res.send(result)
            });
            //payment
            app.post('/create-payment-intent',async(req,res)=>{
                const order=req.body;
                const price=order.price;
                const amount=price *100;
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: ['card']
                  })
                  res.send({clientSecret:paymentIntent.client_secret})
            });
            app.post('/payments',async(req,res)=>{
                const payment=req.body;
                const result = await paymentsCollection.insertOne(payment);
                const id=payment.orderId;
                const filter={_id: new ObjectId(id)};
                const updatedDoc={
                    $set: {
                        paid: true,
                        transactionId: payment.transactionId
                    }
                }
                const updatedResult= await orderCollection.updateOne(filter,updatedDoc)
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

