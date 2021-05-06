import express from "express";
import multer from "multer";
import cors from "cors";
import { writeFile, statSync, createReadStream, readFileSync } from 'fs';
import mongo from 'mongodb';
const { MongoClient } = mongo;
import bcrypt from 'bcrypt';

const connectionString = "mongodb://uaebrvcvsj0zlq7b842v:fKOAXtmFVFcFnGTUygS7@bqhnmd47klqipam-mongodb.services.clever-cloud.com:27017/bqhnmd47klqipam"

const init = async () => {
  const client = new MongoClient(connectionString, {
    useUnifiedTopology: true,
  })
  await client.connect();

  const app = express();
  app.use(cors());
  app.use(express.json())
  const upload = multer({ dest: "./public/uploads" });
  const db = await client.db("bqhnmd47klqipam")
  const entries = db.collection('entries')
  const hashes = db.collection('hashes')

  app.post("/api/storeVideo", upload.single("video"), async (req, res) => {
    console.log(req.file, req.body);
    const { thumbnail, timestamp, ip } = req.body;
    const { filename } = req.file;

    let base64Image = thumbnail.split(';base64,').pop();
    writeFile(`./public/uploads/${filename}.webp`, base64Image, { encoding: 'base64' }, function (err) {
      console.log('File created');
    });

    const result = await entries.insertOne({
      filename, timestamp, ip
    })

    res.json("result");
  });

  app.get("/video/:filename", (req, res) => {
    const { filename } = req.params
    const videoFile = fs.readFileSync(`./public/uploads/${filename}`)
    var encoded = new Buffer(videoFile).toString('base64')
    res.json({ video: encoded })
  });

  app.get("/api/getEntries", async (req, res) => {
    const data = await entries.find({}).toArray();
    data.map((entry) => {
      const image = readFileSync(`./public/uploads/${entry.filename}.webp`)
      const base64 = `data:image/webp;base64,${image.toString('base64')}`
      return Object.assign(entry, { image: base64 })

    })
    res.json({ status: "ok", data }).end()
  })

  app.post('/api/signin', async (req, res) => {
    const { username, password } = req.body;
    const userData = await hashes.findOne({
      username: username
    }, { hash: true, _id: false })
    // console.log(userData)
    if (userData) {
      bcrypt.compare(password, userData.hash, (err, result) => {
        if (result) {
          return res.json({ status: "OK" })
        }
          return res.status(400).json({ status: "Invalid Credentials" });
      });
    } else {
      res.status(400).json({status: "Invalid Credentials"})
    }
  })

  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () =>
    console.log(`Server is running on https://localhost:${PORT}`)
  );

}

init();



