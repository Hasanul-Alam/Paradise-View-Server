const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uvq0yvv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const database = client.db("Paradise-View");
    const bookingsCollection = database.collection("bookings");
    const roomsCollection = database.collection("rooms");
    const usersCollection = database.collection("users");
    const reviewCollection = database.collection("reviews");
    const newslettersCollection = database.collection("newsletters");

    // Check room availability route
    app.post("/check-availability", async (req, res) => {
      const { roomType, checkInDate, checkOutDate, rooms } = req.body;

      // Find room details from rooms collection
      const room = await roomsCollection.findOne({ type: roomType });
      if (!room) {
        return res.status(404).json({ message: "Room type not found" });
      }

      const totalAvailableRooms = room.totalRooms;

      // Find bookings that overlap the requested dates
      const overlappingBookings = await bookingsCollection
        .find({
          roomType,
          $or: [
            {
              startDate: { $lte: checkOutDate },
              endDate: { $gte: checkInDate },
            },
          ],
        })
        .toArray();
      console.log(overlappingBookings);

      // Calculate already booked rooms during this period
      const bookedRooms = overlappingBookings.reduce((total, booking) => {
        return total + booking.roomsBooked;
      }, 0);
      // console.log(bookedRooms)

      // Check availability
      const availableRooms = totalAvailableRooms - bookedRooms;
      if (availableRooms >= rooms) {
        res.json({ available: true });
      } else {
        res.json({ available: false });
      }
    });

    // Book room route
    app.post("/book-room", async (req, res) => {
      const {
        email,
        roomType,
        roomsBooked,
        numOfPersons,
        startDate,
        endDate,
        status,
      } = req.body;

      // Insert the booking into the bookings collection
      const booking = {
        email,
        roomType,
        roomsBooked,
        numOfPersons,
        startDate,
        endDate,
        status,
      };

      const result = await bookingsCollection.insertOne(booking);
      res.json({
        success: true,
        message: "Booking successful",
        bookingId: result.insertedId,
      });
    });

    // Get bookings by email
    app.get("/bookings/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = await bookingsCollection.find(query).toArray();
      res.send(cursor);
    });

    // Delete booking by id
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    // Post user data
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Post user review
    app.post("/reviews", async (req, res) => {
      const data = req.body;
      const result = await reviewCollection.insertOne(data);
      res.send(result);
    });
    // Get reviews by email
    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = await reviewCollection.find(query).toArray();
      res.send(cursor);
    });

    // Get all users
    app.get("/users", async (req, res) => {
      const cursor = await usersCollection.find({}).toArray();
      res.send(cursor);
    });

    // Get user by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = await usersCollection.find(query).toArray();
      res.send(cursor);
    });

    // Update user role by id
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: data,
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete User
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Get all rooms
    app.get("/rooms", async (req, res) => {
      const cursor = await roomsCollection.find({}).toArray();
      res.send(cursor);
    });

    // Post room
    app.post("/rooms", async (req, res) => {
      const data = req.body;
      const cursor = await roomsCollection.insertOne(data);
      res.send(cursor);
    });

    // Get single room by id
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.find(query).toArray();
      res.send(result);
    });

    // Update room data
    app.patch("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: data,
      };
      const result = await roomsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete Room Data
    app.delete("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.deleteOne(query);
      res.send(result);
    });

    // Get all bookings
    app.get("/bookings", async (req, res) => {
      const cursor = await bookingsCollection.find({}).toArray();
      res.send(cursor);
    });

    // Update booking status
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      // const isConfirmed = req.body.isConfirmed;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: data,
      };
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Post newsletter
    app.post("/newsletters", async (req, res) => {
      const data = req.body;
      const result = await newslettersCollection.insertOne(data);
      res.send(result);
    });

    // get all newsletters
    app.get("/newsletters", async (req, res) => {
      const cursor = await newslettersCollection.find({}).toArray();
      res.send(cursor);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Home route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
