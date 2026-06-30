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

    const db = client.db("flavorflow"); // Use the database name "flavorflow"
    const LikesCollection = db.collection("likes"); // Use the collection name "likes"
    const FavoritesCollection = db.collection("favorites"); // Use the collection name "favorites"
    const ReportsCollection = db.collection("reports"); // Use the collection name "reports"
    const SubscriptionPlansCollection = db.collection("subscriptionPlans"); // Use the collection name "subscriptionPlans"

    const PaymentCollection = db.collection("payments");
    const RecipeCollection = db.collection("recipes"); // Use the collection name "recipes"
    const usersCollection = db.collection("user"); // Use the collection name "user"
    const UserSubscriptions = db.collection("user_subscriptions"); // Use the collection name "user_subscriptions"
    const transactionsCollection = db.collection("transactions"); // Use the collection name "transactions"
    await LikesCollection.createIndex(
      { recipeId: 1, userId: 1 },
      { unique: true },
    );
    await FavoritesCollection.createIndex(
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

    // Post subscription plan
    // app.post("/api/subscription-plans", async (req, res) => {
    //   try {
    //     const subscriptionPlan = req.body;
    //     const result =
    //       await SubscriptionPlansCollection.insertOne(subscriptionPlan);
    //     res.status(201).send(result);
    //   } catch (error) {
    //     res.status(500).json({ success: false, message: error.message });
    //   }
    // });

    // Get all subscription plans
    app.get("/api/subscription-plans", async (req, res) => {
      try {
        const subscriptionPlans = await SubscriptionPlansCollection.find(
          {},
        ).toArray();
        res.send(subscriptionPlans);
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

    // Favorite & Unfavorite
    app.patch("/api/recipes/:id/favorite", async (req, res) => {
      try {
        const recipeId = req.params.id;
        const { action, favRecipe } = req.body;
        const userId = favRecipe.userId;
        console.log("Favorite Recipe Data:", favRecipe);
        if (!recipeId || !userId) {
          return res
            .status(400)
            .json({ success: false, message: "Missing or invalid data" });
        }
        if (action === "favorite") {
          const result = await FavoritesCollection.insertOne(favRecipe);
          res.status(200).json({ success: true, message: "Recipe favorited" });
        } else if (action === "unfavorite") {
          const query = { recipeId: recipeId, userId: userId };
          const result = await FavoritesCollection.deleteOne(query);
          res
            .status(200)
            .json({ success: true, message: "Recipe unfavorited" });
        } else {
          res.status(400).json({ success: false, message: "Invalid action" });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Get Favorite recipes for a user
    app.get("/api/user/:userId/favorite-recipes", async (req, res) => {
      try {
        const userId = req.params.userId;

        const favoriteRecipes = await FavoritesCollection.find({
          userId: userId,
        }).toArray();

        res.status(200).json({ success: true, favoriteRecipes });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Delete a favorite recipe using userId and recipeId
    app.delete(
      "/api/user/:userId/favorite-recipes/:recipeId",
      async (req, res) => {
        try {
          const { userId, recipeId } = req.params;
          console.log("Deleting Favorite Recipe:", { userId, recipeId });
          const query = {
            userId: userId,
            recipeId: recipeId,
          };
          console.log("Delete Query:", query);
          const existingData = await FavoritesCollection.findOne(query);
          console.log("Existing Favorite Data:", existingData);
          const result = await FavoritesCollection.deleteOne(query);
          console.log(result, "delete result");
          if (result.deletedCount === 0) {
            return res
              .status(404)
              .json({ success: false, message: "Favorite not found" });
          }
          res
            .status(200)
            .json({ success: true, message: "Recipe unfavorited" });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      },
    );

    // Report a recipe
    app.post("/api/recipes/report", async (req, res) => {
      try {
        const reportData = req.body;
        const result = await ReportsCollection.insertOne({
          ...reportData,
        });
        console.log("Report Result:", result);
        res
          .status(201)
          .json({ success: true, message: "Recipe reported successfully" });
      } catch (error) {
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

    // Get Favorite status for a recipe
    app.get("/api/user/recipes/:id/favorite-status", async (req, res) => {
      try {
        const recipeId = req.params.id;
        const userId = req.query.userId;

        const existingFavorite = await FavoritesCollection.findOne({
          recipeId,
          userId: userId,
        });

        res.status(200).json({ isFavorite: !!existingFavorite });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Get total Favorites count for a recipe
    app.get("/api/recipes/:id/favorites-count", async (req, res) => {
      try {
        const recipeId = req.params.id;
        const userId = req.query.userId;
        const favoriteRecipes = await FavoritesCollection.find({
          recipeId: new ObjectId(recipeId),
          userId: userId,
        }).toArray();

        res.status(200).json({ count: favoriteRecipes.length });
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

    // Delete a recipe by ID
    app.delete("/api/recipes/:id", async (req, res) => {
      try {
        const recipeId = req.params.id;
        console.log("Deleting Recipe ID:", recipeId);
        if (!ObjectId.isValid(recipeId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid Recipe ID",
          });
        }
        const deletedRecipe = await RecipeCollection.deleteOne({
          _id: new ObjectId(recipeId),
        });
        console.log("Deleted Recipe Result:", deletedRecipe);
        if (!deletedRecipe) {
          return res.status(404).json({
            success: false,
            message: "Recipe not found",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Recipe deleted successfully",
        });
      } catch (error) {
        console.error("Error in deleteRecipe Controller:", error);
        return res.status(500).json({
          success: false,
          message: "Server Error! Failed to delete recipe.",
        });
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

    // Update user subscription plan and record transaction
    app.post("/api/users/subscription/update", async (req, res) => {
      try {
        const {
          userEmail,
          userId,
          amount,
          transactionId,
          paymentStatus,
          planId,
        } = req.body;

        if (
          !userEmail ||
          !userId ||
          !amount ||
          !transactionId ||
          !paymentStatus ||
          !planId
        ) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields in the request body",
          });
        }

        // 1. Fetch details of the selected subscription plan to compute accurate recipe limits
        const plan = await SubscriptionPlansCollection.findOne({
          planId: planId,
        });

        if (!plan) {
          return res.status(404).json({
            success: false,
            message: "Selected subscription plan details not found",
          });
        }

        // Compute dynamic variables based on plan characteristics
        const recipeLimit =
          planId === "lifetime" ? 999999 : plan.recipeLimit || 250;

        // Calculate expiration timestamp: +30 Days for premium, null for lifetime
        let expireAt = null;
        if (planId === "premium") {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 30);
          expireAt = expirationDate.toISOString();
        }

        const paymentDate = new Date().toISOString();

        // 2. Perform database mutations in single atomic updates using MongoDB driver

        // A. Insert the Transaction Record
        const transactionRecord = {
          userId,
          userEmail,
          amount: parseFloat(amount),
          transactionId,
          paymentStatus,
          planId,
          createdAt: paymentDate,
        };

        const transactionResult =
          await transactionsCollection.insertOne(transactionRecord);

        // B. Create or update the detailed User Subscription record
        const subscriptionUpdate = {
          $set: {
            plan: planId,
            expireAt: expireAt,
            recipeLimit: recipeLimit,
            updatedAt: paymentDate,
          },
          $setOnInsert: {
            userId: userId,
            createdAt: paymentDate,
          },
        };

        // C. Update status flags inside the main "user" collection matching MongoDB schema examples
        const userUpdateResult = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              planId: planId,
              expireAt: expireAt,
              recipeLimit: recipeLimit,
              updatedAt: paymentDate,
            },
          },
        );

        return res.status(200).json({
          success: true,
          message: "Subscription successfully updated and transaction saved!",
          data: {
            transactionId: transactionId,
            planId: planId,
            expireAt: expireAt,
            recipeLimit: recipeLimit,
          },
        });
      } catch (error) {
        console.error(
          "Error inside Express subscription update API endpoint:",
          error,
        );
        return res.status(500).json({
          success: false,
          message:
            "Internal server error occurred while updating membership records.",
          error: error.message,
        });
      }
    });

    /* ==========================================================================
   Admin Panel API Endpoints
   ========================================================================== */

    // Admin Dashboard Overview Route
    app.get("/api/admin/:adminId/dashboard-overview", async (req, res) => {
      try {
        const { adminId } = req.params;

        if (!ObjectId.isValid(adminId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Admin ID format" });
        }

        const requester = await usersCollection.findOne({
          _id: new ObjectId(adminId),
        });
        if (!requester || requester.role !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Access denied. Only admins can view this data.",
          });
        }

        const [
          totalUsers,
          totalRecipes,
          totalPremiumMembers,
          totalPendingReports,
          mostLikedRecipeDoc,
          featuredRecipesCount,
          latestUserDoc,
          recentReportsList,
        ] = await Promise.all([
          usersCollection.countDocuments({}),

          RecipeCollection.countDocuments({}),

          usersCollection.countDocuments({
            planId: "premium",
          }),

          ReportsCollection.countDocuments({ status: "Pending" }),

          RecipeCollection.find({}).sort({ likesCount: -1 }).limit(1).toArray(),

          RecipeCollection.countDocuments({ isFeatured: true }),

          usersCollection.find({}).sort({ _id: -1 }).limit(1).toArray(),

          ReportsCollection.find({}).sort({ _id: -1 }).limit(5).toArray(),
        ]);

        const mostLikedRecipe =
          mostLikedRecipeDoc[0]?.recipeName || "No recipes found";
        const latestUser = latestUserDoc[0]?.name || "No users found";

        res.status(200).json({
          totalUsers,
          totalRecipes,
          totalPremiumMembers,
          totalReports: totalPendingReports,
          mostLikedRecipe,
          featuredRecipes: featuredRecipesCount,
          latestUser,
          recentReports: recentReportsList,
        });
      } catch (error) {
        console.error("Error fetching admin dashboard overview:", error);
        res.status(500).json({
          success: false,
          message:
            "Internal server error occurred while retrieving administrative overview records.",
        });
      }
    });

    // Get all users
    app.get("/api/users/total-users", async (req, res) => {
      try {
        const totalUsers = await usersCollection.find().toArray();
        res.status(200).json({
          success: true,
          totalUsers,
        });
      } catch (error) {
        console.error("Error fetching total users:", error);
        res.status(500).json({
          success: false,
          message:
            "Internal server error occurred while retrieving total users.",
        });
      }
    });

    // Get all transactions
    app.get("/api/transactions/total-transactions", async (req, res) => {
      try {
        const transactions = await transactionsCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).json(transactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch transactions",
          error: error.message,
        });
      }
    });

    // Get total reports
    app.get("/api/reports/total-reports", async (req, res) => {
      try {
        const totalReports = await ReportsCollection.find().toArray();
        res.status(200).json({
          success: true,
          totalReports,
        });
      } catch (error) {
        console.error("Error fetching total reports:", error);
        res.status(500).json({
          success: false,
          message:
            "Internal server error occurred while retrieving total reports.",
        });
      }
    });

    // PUT API to Toggle Block/Unblock Status
    app.patch("/api/users/:id/toggle-block", async (req, res) => {
      try {
        const userId = req.params.id;

        if (!ObjectId.isValid(userId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid User ID format",
          });
        }

        const user = await usersCollection.findOne({
          _id: new ObjectId(userId),
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const newBlockStatus = !user.isBlocked;

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              isBlocked: newBlockStatus,
              updatedAt: new Date().toISOString(),
            },
          },
        );

        if (result.modifiedCount === 0) {
          return res.status(500).json({
            success: false,
            message: "Failed to update user block status",
          });
        }

        return res.status(200).json({
          success: true,
          message:
            newBlockStatus ?
              "User blocked successfully!"
            : "User unblocked successfully!",
          isBlocked: newBlockStatus,
        });
      } catch (error) {
        console.error("Error in toggle-block controller:", error);
        return res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: error.message,
        });
      }
    });

    // PATCH /api/recipes/:id/toggle-featured
    app.patch("/api/recipes/:id/toggle-featured", async (req, res) => {
      try {
        const { id } = req.params;
        console.log("Toggle Featured Recipe ID:", id);

        // Get current value
        const recipe = await RecipeCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!recipe) {
          return res.status(404).json({ message: "Recipe not found" });
        }

        // toggle the value
        const result = await RecipeCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              isFeatured: !recipe.isFeatured,
              updatedAt: new Date().toISOString(),
            },
          },
        );

        if (result.modifiedCount === 0) {
          return res.status(500).json({ message: "Failed to update recipe" });
        }

        res.status(200).json({
          success: true,
          isFeatured: !recipe.isFeatured,
          message:
            !recipe.isFeatured ?
              "Recipe marked as featured"
            : "Recipe removed from featured",
        });
      } catch (error) {
        console.error("Toggle featured error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Delete Recipe with Report
    app.delete("/api/recipes/:recipeId/report/:reportId", async (req, res) => {
      const { recipeId, reportId } = req.params;
      console.log("Deleting Recipe and Report:", { recipeId, reportId });
      try {
        if (!recipeId || !ObjectId.isValid(reportId)) {
          return res
            .status(400)
            .json({ message: "Invalid recipe or report ID" });
        }

        // Delete the recipe
        const recipeDeleteResult = await RecipeCollection.deleteOne({
          _id: new ObjectId(recipeId),
        });
        console.log("Recipe Delete Result:", recipeDeleteResult);
        // Delete the report
        const reportDeleteResult = await ReportsCollection.deleteOne({
          _id: new ObjectId(reportId),
        });
        console.log("Report Delete Result:", reportDeleteResult);
      } catch (error) {
        console.error("Error deleting recipe report:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // delete report only
    app.delete("/api/reports/:reportId", async (req, res) => {
      const { reportId } = req.params;
      console.log("Deleting Report:", { reportId });
      try {
        if (!reportId || !ObjectId.isValid(reportId)) {
          return res.status(400).json({ message: "Invalid report ID" });
        }

        const reportDeleteResult = await ReportsCollection.deleteOne({
          _id: new ObjectId(reportId),
        });
        console.log("Report Delete Result:", reportDeleteResult);

        if (reportDeleteResult.deletedCount === 0) {
          return res.status(404).json({ message: "Report not found" });
        }
        res
          .status(200)
          .json({ success: true, message: "Report deleted successfully" });
      } catch (error) {
        console.error("Error deleting report:", error);
        res.status(500).json({ message: "Internal server error" });
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
