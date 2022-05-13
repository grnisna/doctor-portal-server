const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port= process.env.PORT || 5000;

// milldle ware 
app.use(cors());
app.use(express.json());

// --------------------get primary------------
app.get('/', (req,res)=>{
    res.send('I"m Nisan ahmed');
});

app.listen(port , ()=>{
    console.log('Running Port:' , port);
});