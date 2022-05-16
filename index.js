const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const verify = require('jsonwebtoken/verify');

const port = process.env.PORT || 5000;

// milldle ware 
app.use(cors());
app.use(express.json());

// ---------mongo db connection -----------


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kemvm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// -----------------secure user access by token ----------------
const varifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unAuthorized ' })
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden' })
        }

        req.decoded = decoded;
        next();
    })
}


async function run() {

    try {
        await client.connect();
        const serviceCollection = client.db("doctor_portal").collection("service");
        const bookingCollection = client.db("doctor_portal").collection("booking");
        const userCollection = client.db("doctor_portal").collection("users");

        // --------get all services from mongodeb and send client ------ 
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);

            const services = await cursor.toArray();
            res.send(services);
        });

        // --------- date onujayi data ke update kora --------- 
        app.get('/available', async (req, res) => {
            const date = req.query.date;
            const services = await serviceCollection.find().toArray();

            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            services.forEach(service => {
                const serviceBookings = bookings.filter(book => book.treatement === service.name);
                const bookedSlots = serviceBookings.map(book => book.slot);
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                service.slots = available;
            });
            res.send(services);
        });

        // --------- user ke maintain kora  sathe token send kora-------------- /
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });

            res.send({ result, token });
        });

        // -------------- make role in admin ---------- 
        app.put('/user/admin/:email',varifyJWT,async(req,res)=>{
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({email:requester});
            if(requesterAccount.role === 'admin'){
                const filter ={email:email};
                const updateDoc ={ $set:{role:'admin'}};
                const result = await userCollection.updateOne(filter,updateDoc);
                return res.send(result);
            }
            else{
                return res.status(403).send({message:'forbidden'});
            }
        });

        // -------------------- check admin ====------------------ 
        app.get('/admin/:email', async(req,res)=>{
            const email = req.params.email;
            const user = await userCollection.findOne({email:email});
            const isAdmin = user.role === 'admin';
            res.send({admin:isAdmin});
        
        })

        // ============== get user from mongoDB for admin ========= 
        app.get('/user', varifyJWT, async(req,res)=>{
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        // --------- conditional kichu data mongodb theke niye UI te show korano -----  

        app.get('/booking', varifyJWT, async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const decodedEmail = req.decoded.email;
            if (patient === decodedEmail) {
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            }
            else{
                return res.status(403).send({message:'forbidden'})
            }
        });

        // --------UI theke data mongoDb te send kora -------- 

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatement: booking.treatement, date: booking.date, patient: booking.patient };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists });
            }

            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        });


    }
    finally {
        // client.close();
    }

}
run().catch(console.dir);


// --------------------get primary------------
app.get('/', (req, res) => {
    res.send('I"m Nisan ahmed');
});

app.listen(port, () => {
    console.log('Running Port:', port);
});