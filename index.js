const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send("Server is running......")
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a46jnic.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        client.connect();

        const userCollections = client.db("AbacusDB").collection("users");
        const apartmentCollections = client.db("AbacusDB").collection("apartments");
        const blogsCollections = client.db("AbacusDB").collection("blogs");
        const reviewsCollections = client.db("AbacusDB").collection("reviews");
        const appointmentsCollections = client.db("AbacusDB").collection("appointments");
        const favoritesCollections = client.db("AbacusDB").collection("favorites");

        // Users API
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user.email }
            const existingUser = await userCollections.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }
            const result = await userCollections.insertOne(user);
            res.send(result)
        })



        // Get All Users
        app.get('/users', async (req, res) => {
            const result = await userCollections.find().toArray()
            res.send(result)
        })

        // Get user by email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await userCollections.findOne(filter)
            res.send(result)
        })

        // Update User
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedinfo = req.body

            const options = {};
            // Specify the update to set a value for the fields
            const updateDoc = {
                $set: {
                    phone: updatedinfo.phone,
                    address: updatedinfo.address
                },
            };
            // Update the first document that matches the filter
            const result = await userCollections.updateOne(filter, updateDoc, options);
            if (result.modifiedCount === 1) {
                res.status(200).json({ acknowledged: true });
            } else {
                res.status(500).json({ acknowledged: false, error: "Failed to update user information." });
            }
        });


        // Post a Apartment
        app.post('/apartments', async (req, res) => {
            const apartment = req.body;
            const result = await apartmentCollections.insertOne(apartment);
            res.send(result)
        })

        // Get Apartments
        app.get('/apartments', async (req, res) => {
            const result = await apartmentCollections.find().toArray();
            res.send(result)
        })

        // Get Apartment by id
        app.get('/apartments/:id', async (req, res) => {
            const id = req.params
            const filter = { _id: new ObjectId(id) }
            const result = await apartmentCollections.findOne(filter)
            res.send(result)
        })

        // Post a Blog
        app.post('/blogs', async (req, res) => {
            const blog = req.body;
            const result = await blogsCollections.insertOne(blog);
            res.send(result)
        })

        // Get blog
        app.get('/blogs', async (req, res) => {
            const result = await blogsCollections.find().toArray();
            res.send(result)
        })

        // post a favorite apartment
        app.post('/favorites', async (req, res) => {
            const fav = req.body;
            const result = await favoritesCollections.insertOne(fav);
            res.send(result)
        })

        // Get favorite apartment
        app.get('/favorites', async (req, res) => {
            const result = await favoritesCollections.find().toArray();
            res.send(result)
        })

        // find favorite by email
        app.get('/favorites/:email', async (req, res) => {
            const email = req.params.email;
            const filter = {
                userEmail: email
            }
            const result = await favoritesCollections.find(filter).toArray();
            res.send(result)
        })

        // Delete a favorite
        app.delete('/favorites/:id', async (req, res) => {
            const id = req.params.id; // Access the 'id' parameter correctly
            const filter = {
                _id: new ObjectId(id)
            };
            const result = await favoritesCollections.deleteOne(filter);
            res.send(result);
        });

        // Post a Appointment
        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollections.insertOne(appointment);
            res.send(result)
        })

        // Get Appointments
        app.get('/appointments', async (req, res) => {
            const result = await appointmentsCollections.find().toArray();
            res.send(result)
        })

        // Change apartment postStatus
        app.patch('/apartments/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const newStatus = req.body

            const updateDoc = {
                $set: {
                    postStatus: newStatus?.postStatus
                },
            };
            const result = await apartmentCollections.updateOne(filter, updateDoc)
            res.send(result)
        })


        // Delete Apartment post
        app.delete('/apartments/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            }

            const result = await apartmentCollections.deleteOne(filter)
            res.send(result)
        })
        // Get appointment time slot
        app.get("/appointments/booked-time-slots", async (req, res) => {
            try {
                const { date } = req.query;
                const selectedDate = new Date(date);

                const filter = {
                    date: selectedDate.toDateString()
                }
                const bookedAppointments = await appointmentsCollections.find(filter).toArray()
                const bookedTimeSlots = bookedAppointments.map(appointment => appointment.timeSlot);
                res.json(bookedTimeSlots);
            } catch (error) {
                console.error("Error fetching booked appointments:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        });




        // Post a Review
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollections.insertOne(review);
            res.send(result)
        })

        // Get Review
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollections.find().toArray();
            res.send(res)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.error(err);
    } finally {
        // Uncomment the following line if you want to ensure the connection is closed when the script finishes
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server is running at port: ${port}`);
});
