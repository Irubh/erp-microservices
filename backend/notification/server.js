const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*"
  }
})

let users = {}

io.on("connection", (socket) => {

  socket.on("register", (userId) => {
    users[userId] = socket.id
  })

  socket.on("disconnect", () => {
    for (let user in users) {
      if (users[user] === socket.id) {
        delete users[user]
      }
    }
  })
})

app.post("/notify", (req, res) => {

  console.log("Notification recieved:", req.body)  

  const { target_user, po_id, status } = req.body

  const socketId = users[target_user]

  if (socketId) {
    io.to(socketId).emit("notification", {
      message: `PO ${po_id} status changed to ${status}`
    })
  }

  res.json({ success: true })
})

server.listen(8004, () => {
  console.log("Notification service running on port 8004")
})