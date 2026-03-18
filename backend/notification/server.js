require("dotenv").config()
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const jwt = require("jsonwebtoken")

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

io.use((socket, next) => {
  const token = socket.handshake.auth?.token  // frontend sends this on connect

  if (!token) {
    return next(new Error("Authentication required"))
  }

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    return next(new Error("Token invalid or expired"))
  }
})

io.on("connection", (socket) => {

  const userId = socket.user.sub           

  console.log(`Connected: ${userId} (${socket.user.role})`)
  users[userId] = socket.id

  socket.on("disconnect", () => {
    delete users[userId]
    console.log(`Disconnected: ${userId}`)
  })
})

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"]

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" })
  }

  try {
    req.user = jwt.verify(
      authHeader.split(" ")[1],
      process.env.JWT_SECRET
    )
    next()
  } catch (err) {
    return res.status(401).json({ error: "Token invalid or expired" })
  }
}

app.post("/notify", authMiddleware, (req, res) => {

  console.log("Notification recieved:", req.body)
  console.log("Triggered by:", req.user.sub)  

  const { target_user, po_id, status } = req.body

  const socketId = users[target_user]

  if (socketId) {
    io.to(socketId).emit("notification", {
      message: `PO ${po_id} status changed to ${status}`
    })
    console.log('Notified user: ${target_user}')
  } else{
    console.log('User ${target_user} not connected - skipping notification')
  }

  res.json({ success: true })
})

server.listen(8004, () => {
  console.log("Notification service running on port 8004")
})