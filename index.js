const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 8000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    await client.connect();

    const db = client.db("flavorflow");
    const RecipeCollection = db.collection("recipes");
    const LikesCollection = db.collection("likes");
    const usersCollection = db.collection("user");
    await LikesCollection.createIndex(
      { recipeId: 1, userId: 1 },
      { unique: true },
    );
    // update user additional info
    app.patch("/update/:userId", async (req, res) => {
      try {
        const userId = req.params.userId;
        const updateData = req.body;
        const filter = { _id: new ObjectId(userId) };
        const update = {
          $set: {
            ...updateData,
          },
        };
        const result = await usersCollection.findOneAndUpdate(filter, update);
        res.send(result);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Create a new recipe
    app.post("/api/recipes/publish", async (req, res) => {
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

    // Get all recipes
    app.get("/recipes", async (req, res) => {
      try {
        const recipes = await RecipeCollection.find({}).toArray();
        res.send(recipes);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //  Get a single recipe by ID
    app.get("/api/recipes/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Recipe ID format" });
        }

        const query = { _id: new ObjectId(id) };
        const recipe = await RecipeCollection.findOne(query);

        if (!recipe) {
          return res
            .status(404)
            .json({ success: false, message: "Recipe not found!" });
        }

        res.status(200).json({ success: true, data: recipe });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Get recipes by user ID
    app.get("/api/user/:userId/recipes", async (req, res) => {
      try {
        const userId = req.params.userId;
        const recipes = await RecipeCollection.find({
          "author.id": userId,
        }).toArray();

        res.status(200).json({ success: true, data: recipes });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Like & Unlike
    app.patch("/api/recipes/:id/like", async (req, res) => {
      try {
        const recipeId = req.params.id;
        const { action, userId } = req.body;

        if (!ObjectId.isValid(recipeId) || !userId) {
          return res
            .status(400)
            .json({ success: false, message: "Missing or invalid data" });
        }

        const query = { _id: new ObjectId(recipeId) };
        const likeQuery = { recipeId: new ObjectId(recipeId), userId: userId };

        // LIKE ACTION
        if (action === "like") {
          // upsert: true এবং $setOnInsert
          const result = await LikesCollection.updateOne(
            likeQuery,
            { $setOnInsert: likeQuery },
            { upsert: true },
          );

          if (result.upsertedCount > 0) {
            await RecipeCollection.updateOne(query, {
              $inc: { likesCount: 1 },
            });
          }
        }

        // UNLIKE ACTION
        else if (action === "unlike") {
          const result = await LikesCollection.deleteOne(likeQuery);

          if (result.deletedCount > 0) {
            await RecipeCollection.updateOne(query, {
              $inc: { likesCount: -1 },
            });
          }
        }

        const updatedRecipe = await RecipeCollection.findOne(query, {
          projection: { likesCount: 1 },
        });

        res.status(200).json({
          success: true,
          likesCount: updatedRecipe?.likesCount || 0,
        });
      } catch (error) {
        if (error.code === 11000) {
          return res
            .status(400)
            .json({ success: false, message: "Action already processed" });
        }
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // GET /api/recipes/:id/like-status?userId=...
    app.get("/api/recipes/:id/like-status", async (req, res) => {
      try {
        const recipeId = req.params.id;
        const userId = req.query.userId;

        if (!userId) {
          return res.status(200).json({ isLiked: false });
        }

        const existingLike = await LikesCollection.findOne({
          recipeId: new ObjectId(recipeId),
          userId: userId,
        });

        res.status(200).json({ isLiked: !!existingLike });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // update recipe by ID
    app.patch("/api/recipes/:id", async (req, res) => {
      try {
        const recipeId = req.params.id;
        const updateData = req.body;
        console.log("Update Data:", updateData);
        console.log("Recipe ID:", recipeId);
        const updatedRecipe = await RecipeCollection.updateOne(
          { _id: new ObjectId(recipeId) },
          { $set: updateData },
        );
        console.log("Updated Recipe Result:", updatedRecipe);
        if (updatedRecipe.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Recipe not found",
          });
        }

        res.status(200).json({ success: true, recipe: updatedRecipe });
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

    // Get Featured & Popular Recipe
    app.get("/api/feature&popularRecipe", async (req, res) => {
      try {
        const featuredRecipes = await RecipeCollection.find({
          isFeatured: true,
          status: "published",
        })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();

        const popularRecipes = await RecipeCollection.find({
          status: "published",
        })
          .sort({ likesCount: -1 })
          .limit(6)
          .toArray();

        return res.status(200).json({
          success: true,
          featuredRecipes,
          popularRecipes,
        });
      } catch (error) {
        console.error("Error in getHomeRecipes Controller:", error);
        return res.status(500).json({
          success: false,
          message: "Server Error! Failed to fetch home data.",
        });
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
