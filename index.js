const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;


app.use(express.json());


app.get('/', (req, res) => {
  res.send('Reddit Questions API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  //this is the basic express server setup.. - Note for Robert
 // IMPORTANT: make sure to run npm i or npm install . don't forget woowwwwww
 // i made a google docs and added the link right here, open it, thats where i will be adding the notes for the project, right now i added what depoendecies i installed on this project so far.
 //https://docs.google.com/document/d/1brk-M6SG2ejJMH5XAxrn9KeEqYBvVEMn0ILkNc0IWRc/edit?usp=sharing
});
