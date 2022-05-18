const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const verify = require('jsonwebtoken/verify');

const port = process.env.PORT || 5000;

// milldle ware 
app.use(cors());
app.use(express.json());

// ---------------node mailer-----------------------------------------
// -------------------------------------------------------------------
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'mdnisanahmed63@gmail.com',
      pass: 'lmjtqgnszmcdnyef'
    }
  });

const sendAppointmentEmail = booking =>{
    const {patient,patientName,date,slot,treatement} = booking;
    var mailOptions = {
        from: 'mdnisanahmed63@gmail.com',
        to: patient,
        subject: `Appointment is Comfirm on ${date} at ${slot}`,
        text: `Confirm you appointment on ${date} at ${slot} `,
        html:`<div>
            <h2>Hello ${patientName},</h2>
            <h4>Your appointment is confirm in <strong> ${treatement}</strong> on ${date} at ${slot} </h4> 
            <p>
            Conscious of its spiritual and moral heritage, the Union is founded on the indivisible, universal values of human dignity, freedom, equality and solidarity; it is based on the principles of democracy and the rule of law. It places the individual at the heart of its activities, by establishing the citizenship of the Union and by creating an area of freedom, security and justice.
            </p>
        </div>`
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}

  


//   ------------------- send appoinment email to user----------------
// 
// ----------------------------------------------------------------------------------

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
        const doctorCollection = client.db('doctor_portal').collection('doctors');

        // ----------------verify admin ----------------------------
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden Access' })
            }
        }

        // --------get all services from mongodeb and send client ------ 
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).project({ name: 1 });

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
        app.put('/user/admin/:email', varifyJWT,verifyAdmin, async (req, res) => {
            const email = req.params.email;
                const filter = { email: email };
                const updateDoc = { $set: { role: 'admin' } };
                const result = await userCollection.updateOne(filter, updateDoc);
                 res.send(result);        


        });

        // -------------------- check admin ====------------------ 
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });

        })

        // ============== get user from mongoDB for admin ========= 
        app.get('/user', varifyJWT, async (req, res) => {
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
            else {
                return res.status(403).send({ message: 'forbidden' })
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
            // send appoint email to user ----------
            sendAppointmentEmail(booking);
            return res.send({ success: true, result });
        });


        // ------------------ set doctor info to mongoDB -------------/ 
        app.post('/doctor',varifyJWT,verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            res.send(result);
        });

        // -------------------- get doctors data for client site --------- 
        app.get('/doctor',varifyJWT,verifyAdmin,async(req,res)=>{
            const doctors = await doctorCollection.find().toArray();
            res.send(doctors);
        });

        // ------------ delele one doctor from mongoDB by client site -------------
        app.delete('/doctor/:email',varifyJWT,verifyAdmin,async(req,res)=>{
            const email = req.params.email;
            const filter = {email:email};
            const result = await doctorCollection.deleteOne(filter);
            res.send(result); 
        });


        // ----------------- get id from mongoDB for payment by client site ---------- 
        app.get('/booking/:id',varifyJWT,async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })


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