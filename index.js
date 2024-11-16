const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Validate environment variables
if (!process.env.DB_USER || !process.env.DB_PASS) {
  console.error("Missing DB_USER or DB_PASS in environment variables.");
  process.exit(1);
}

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uvq0yvv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("Paradise-View");
    const bookingsCollection = db.collection("bookings");
    const roomsCollection = db.collection("rooms");
    const usersCollection = db.collection("users");
    const reviewsCollection = db.collection("reviews");
    const newslettersCollection = db.collection("newsletters");

    // Helper function for error handling
    const withErrorHandling = (handler) => async (req, res) => {
      try {
        await handler(req, res);
      } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    };

    // Routes

    // Room availability
    app.post(
      "/check-availability",
      withErrorHandling(async (req, res) => {
        const { roomType, checkInDate, checkOutDate, rooms } = req.body;
        const room = await roomsCollection.findOne({ type: roomType });

        if (!room) {
          return res.status(404).json({ message: "Room type not found" });
        }

        const totalAvailableRooms = room.totalRooms;

        const overlappingBookings = await bookingsCollection
          .find({
            roomType,
            $or: [
              { startDate: { $lte: checkOutDate }, endDate: { $gte: checkInDate } },
            ],
          })
          .toArray();

        const bookedRooms = overlappingBookings.reduce(
          (total, booking) => total + booking.roomsBooked,
          0
        );

        const availableRooms = totalAvailableRooms - bookedRooms;
        res.json({ available: availableRooms >= rooms });
      })
    );

    // Book room
    app.post(
      "/book-room",
      withErrorHandling(async (req, res) => {
        const booking = req.body;
        const result = await bookingsCollection.insertOne(booking);
        res.json({
          success: true,
          message: "Booking successful",
          bookingId: result.insertedId,
        });
      })
    );

    // Get all bookings or by email
    app.get(
      "/bookings/:email?",
      withErrorHandling(async (req, res) => {
        const query = req.params.email ? { email: req.params.email } : {};
        const bookings = await bookingsCollection.find(query).toArray();
        res.json(bookings);
      })
    );

    // Update booking status
    app.patch(
      "/bookings/:id",
      withErrorHandling(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;
        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        res.json(result);
      })
    );

    // Delete booking
    app.delete(
      "/bookings/:id",
      withErrorHandling(async (req, res) => {
        const result = await bookingsCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.json(result);
      })
    );

    // Users
    app.post(
      "/users",
      withErrorHandling(async (req, res) => {
        const result = await usersCollection.insertOne(req.body);
        res.json(result);
      })
    );

    app.get(
      "/users/:email?",
      withErrorHandling(async (req, res) => {
        const query = req.params.email ? { email: req.params.email } : {};
        const users = await usersCollection.find(query).toArray();
        res.json(users);
      })
    );

    app.patch(
      "/users/:id",
      withErrorHandling(async (req, res) => {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        res.json(result);
      })
    );

    app.delete(
      "/users/:id",
      withErrorHandling(async (req, res) => {
        const result = await usersCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.json(result);
      })
    );

    // Reviews
    app.post(
      "/reviews",
      withErrorHandling(async (req, res) => {
        const result = await reviewsCollection.insertOne(req.body);
        res.json(result);
      })
    );

    app.get(
      "/reviews/:email?",
      withErrorHandling(async (req, res) => {
        const query = req.params.email ? { email: req.params.email } : {};
        const reviews = await reviewsCollection.find(query).toArray();
        res.json(reviews);
      })
    );

    // Rooms
    app.get(
      "/rooms/:id?",
      withErrorHandling(async (req, res) => {
        const query = req.params.id ? { _id: new ObjectId(req.params.id) } : {};
        const rooms = await roomsCollection.find(query).toArray();
        res.json(rooms);
      })
    );

    app.post(
      "/rooms",
      withErrorHandling(async (req, res) => {
        const result = await roomsCollection.insertOne(req.body);
        res.json(result);
      })
    );

    app.patch(
      "/rooms/:id",
      withErrorHandling(async (req, res) => {
        const result = await roomsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        res.json(result);
      })
    );

    app.delete(
      "/rooms/:id",
      withErrorHandling(async (req, res) => {
        const result = await roomsCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.json(result);
      })
    );

    // Newsletters
    app.post(
      "/newsletters",
      withErrorHandling(async (req, res) => {
        const result = await newslettersCollection.insertOne(req.body);
        res.json(result);
      })
    );

    app.get(
      "/newsletters",
      withErrorHandling(async (req, res) => {
        const newsletters = await newslettersCollection.find({}).toArray();
        res.json(newsletters);
      })
    );
  } finally {
    // Close the database connection if needed
    // await client.close();
  }
}

// Initialize server
run().catch((error) => console.error("Failed to start server:", error));

app.get("/", (req, res) => {
  res.send("Hello, Paradise-View API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
