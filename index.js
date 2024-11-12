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
              endDate: { $gte: checkInDate }
            }
          ]
        })
        .toArray();
        console.log(overlappingBookings)

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
      const { email, roomType, roomsBooked, numOfPersons, startDate, endDate } = req.body;

      // Insert the booking into the bookings collection
      const booking = {
        email,
        roomType,
        roomsBooked,
        numOfPersons,
        startDate,
        endDate
      };

      const result = await bookingsCollection.insertOne(booking);
      res.json({ success: true, message: "Booking successful", bookingId: result.insertedId });
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
