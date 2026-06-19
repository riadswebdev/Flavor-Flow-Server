const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 8000;
const { MongoClient, ServerApiVersion } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );

    const db = client.db("flavorflow");
    const RecipeCollection = db.collection("recipes");

    // Create a new recipe
    app.post("/recipes", async (req, res) => {
      try {
        const recipe = req.body;

        recipe.createdAt = new Date();
        recipe.preparationTime = Number(recipe.preparationTime) || 0;
        recipe.likesCount = recipe.likesCount || 0;

        const result = await RecipeCollection.insertOne(recipe);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Get recipes with filtering, sorting, and pagination
    app.get("/api/recipes", async (req, res) => {
      try {
        const {
          search,
          category,
          cuisine,
          difficulty,
          prepTime,
          sortBy,
          page,
        } = req.query;

        const currentPage = parseInt(page) || 1;
        const limit = 9;
        const skip = (currentPage - 1) * limit;

        let query = {};

        if (search) {
          query.recipeName = { $regex: search, $options: "i" };
        }
        if (category && category !== "All") {
          query.category = category;
        }
        if (cuisine && cuisine !== "All Cuisines") {
          query.cuisineType = cuisine;
        }
        if (difficulty && difficulty !== "All Difficulties") {
          query.difficultyLevel = difficulty;
        }

        if (prepTime) {
          if (prepTime === "Under 20 mins") {
            query.preparationTime = { $lt: 20 };
          } else if (prepTime === "20-45 mins") {
            query.preparationTime = { $gte: 20, $lte: 45 };
          } else if (prepTime === "Over 45 mins") {
            query.preparationTime = { $gt: 45 };
          }
        }

        let sortOptions = {};
        if (sortBy === "newest") {
          sortOptions.createdAt = -1;
        } else if (sortBy === "popular") {
          sortOptions.likesCount = -1;
        } else if (sortBy === "time-low") {
          sortOptions.preparationTime = 1;
        }

        const recipes = await RecipeCollection.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalRecipes = await RecipeCollection.countDocuments(query);

        res.status(200).json({
          success: true,
          count: totalRecipes,
          currentPage,
          totalPages: Math.ceil(totalRecipes / limit),
          data: recipes,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
