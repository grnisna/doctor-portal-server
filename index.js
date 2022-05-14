const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// milldle ware 
app.use(cors());
app.use(express.json());

// ---------mongo db connection -----------


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kemvm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        await client.connect();
        const serviceCollection = client.db("doctor_portal").collection("service");
        const bookingCollection = client.db("doctor_portal").collection("booking");

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);

            const services = await cursor.toArray();
            res.send(services);
        });


        // ------------------- get booking slot------------        
        app.get('/engage', async(req,res)=>{
            const date = req.query.date;
            // step 1    get all service data from mongodb example: [{},{},{},{},{},{},{},{},{},{},]
            const allService = await serviceCollection.find().toArray();
            
            // step 2    get only > all booking data from mongodb              
            const query = {date : date};
            const allBook = await bookingCollection.find(query).toArray();

            // step 3 
            // ekti object theke only ekti property ber kore niye asar jonno forEach loop
            allService.forEach(singleService =>{
                // step 4 
                // jegulo booking deoya hoice sudhumatro sei array of object guloexample: [{},{},{},]
                const bookingServices = allBook.filter(book => book.bookingName === singleService.name);

                // step 5 
                // bookingServices er moddhe slot namee string/je time gulo ache jetake ber korte hobe
                const bookingSlots = bookingServices.map(serviceBook => serviceBook.slot);

                // step 6 
                // bookingSlots er moddhe jei slot gulo nai jegulo select kora
                const available  = singleService.slots.filter(bookSlot => !bookingSlots.includes(bookSlot));

                singleService.available = available;
            });

            res.send(allService);

        });
        

        // add booking from UI to mongoDB
        app.post('/engage', async (req, res) => {
            const engaged = req.body;
            const query = {
                        bookingName: engaged.bookingName,
                        bookDate: engaged.bookDate,
                        patientName: engaged.patientName,
                        patientEmail: engaged.patientEmail,
                    };

            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, engaged: exists });
            }
            const result = await bookingCollection.insertOne(engaged);
            res.send({success:true,result});
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