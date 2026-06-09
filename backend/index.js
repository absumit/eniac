import "dotenv/config"
import express from 'express'
import {chatwithgroq} from "./utils/groqapi.js"

const app = express()

app.use(express.json()) 

app.get('/', async (req, res) => {
  const query = req.body?.query;  
  console.log(query)
  const response = await chatwithgroq(query || "hi")
  res.send(response)

})

app.listen(4000, () => {
  console.log('Server is running on http://localhost:4000')
})