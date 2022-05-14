const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const port= process.env.PORT || 5000;

// milldle ware 
app.use(cors());
app.use(express.json());

// ---------mongo db connection -----------


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kemvm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    
    try{
        await client.connect();
        const serviceCollection = client.db("doctor_portal").collection("service");
        const bookingCollection = client.db("doctor_portal").collection("booking");

        app.get('/service', async(req,res)=>{
            const query = {};
            const cursor = serviceCollection.find(query);
            
            const services = await cursor.toArray();
            res.send(services);
        });

        // --------------------booking time ------------
        app.post('/booking', async(req,res)=>{
            const service = req.body;
            const result = await bookingCollection.insertOne(service)
            console.log(result);
            res.send(result);           
            
        })

    }
    finally{
        // client.close();
    }

}
run().catch(console.dir);


// --------------------get primary------------
app.get('/', (req,res)=>{
    res.send('I"m Nisan ahmed');
});

app.listen(port , ()=>{
    console.log('Running Port:' , port);
});