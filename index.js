const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;


app.use(cors({
    origin: ['http://localhost:5173', 'https://homesphere-0.web.app'],
}));

// app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send("Server is running......")
})

// Verify JWT
const VerifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorized access' });
        }
        req.decoded = decoded;
        next()
    })
}

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


        // JWT
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        // VerifyAdmin
        const VerifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollections.findOne(query)
            if (user.role !== "admin") {
                return res.status(401).send({ error: true, message: 'Unauthorized access' });
            }

            next()
        }


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

        // promote or demote as admin

        app.patch('/users/role/:id', VerifyJwt, VerifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { role } = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { role: role },
            };

            try {
                const result = await userCollections.updateOne(filter, updateDoc);

                if (result.modifiedCount > 0) {
                    res.send({ success: true, message: "User role updated successfully" });
                } else {
                    res.send({ success: false, message: "User not found or role is already set" });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: "Error updating user role", error });
            }
        });


        // Update User
        app.patch('/users/:email', VerifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedinfo = req.body
            console.log(updatedinfo);

            const options = {};
            // Specify the update to set a value for the fields
            const updateDoc = {
                $set: {
                    ...updatedinfo
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
        app.post('/apartments', VerifyJwt, async (req, res) => {
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
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await apartmentCollections.findOne(filter)
            res.send(result)
        })
        // Get Apartment by email
        app.get('/apartments/email/:email', VerifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = { "soldBy.email": email }; // Correctly access nested field with quotes
            const result = await apartmentCollections.find(filter).toArray();
            res.send(result);
        });

        // Update a apartment
        app.patch('/apartments/:id', VerifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateData = req.body;

            // Remove _id from updateData if it exists
            delete updateData._id;

            const updateDoc = {
                $set: {
                    ...updateData,
                },
            };
            try {

                const result = await apartmentCollections.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                console.error('Error updating apartment:', error);
                res.status(500).json({ error: 'Failed to update apartment' });
            }
        });

        // Change apartment postStatus
        app.patch('/apartments/:id', VerifyJwt, VerifyAdmin, async (req, res) => {
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
        app.delete('/apartments/:id', VerifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            }

            const result = await apartmentCollections.deleteOne(filter)
            res.send(result)
        })



        // Post a Blog
        app.post('/blogs', VerifyJwt, VerifyAdmin, async (req, res) => {
            const blog = req.body;
            const result = await blogsCollections.insertOne(blog);
            res.send(result)
        })

        // Get blog
        app.get('/blogs', async (req, res) => {
            const result = await blogsCollections.find().toArray();
            res.send(result)
        })

        // Delete a blog
        app.delete('/blogs/:id', VerifyJwt, VerifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const result = await blogsCollections.deleteOne(filter)
            res.send(result)
        })


        // Update a blog
        app.patch('/blogs/:id', VerifyJwt, VerifyAdmin, async (req, res) => {
            const id = req.params.id;
            const updateBlog = req.body
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    title: updateBlog?.title,
                    content: updateBlog?.content
                }
            }
            const result = await blogsCollections.updateOne(filter, updateDoc)
            res.send(result)
        })

        // Get blogs by id
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await blogsCollections.findOne(filter)
            res.send(result)
        })

        // post a favorite apartment
        app.post('/favorites', VerifyJwt, async (req, res) => {
            const fav = req.body;
            const result = await favoritesCollections.insertOne(fav);
            res.send(result)
        })

        // Get favorite apartment
        app.get('/favorites', VerifyJwt, async (req, res) => {
            const result = await favoritesCollections.find().toArray();
            res.send(result)
        })

        // find favorite by email
        app.get('/favorites/:email', VerifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = {
                userEmail: email
            }
            const result = await favoritesCollections.find(filter).toArray();
            res.send(result)
        })

        // Delete a favorite
        app.delete('/favorites/:id', VerifyJwt, async (req, res) => {
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

        // change appointment status
        app.patch('/appointments/:id', VerifyJwt, VerifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const newStatus = req.body
            const updateDoc = {
                $set: {
                    appointmentStatus: newStatus?.appointmentStatus
                },
            };
            const result = await appointmentsCollections.updateOne(filter, updateDoc)
            res.send(result)
        })

        // Get appointment by email

        app.get('/appointments/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const result = await appointmentsCollections.find(filter).toArray()
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
        app.post('/reviews', VerifyJwt, async (req, res) => {
            const review = req.body;
            const result = await reviewsCollections.insertOne(review);
            res.send(result)
        })

        // Get Review
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollections.find().toArray();
            res.send(result)
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