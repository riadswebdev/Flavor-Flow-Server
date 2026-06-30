Flavor Flow Server

A comprehensive backend server for the Flavor Flow recipe sharing platform. This Node.js and Express-based API provides full functionality for managing recipes, user subscriptions, likes, favorites, reports, and administrative operations.

Project Overview

Flavor Flow Server is the backend backbone of a modern recipe sharing and discovery platform. It handles all server-side operations including user management, recipe publishing, social interactions (likes and favorites), subscription management, payment processing, and administrative controls. The server uses MongoDB for data persistence and is deployed on Vercel.

Features

Recipe Management
- Create, read, update, and delete recipes
- Publish recipes with detailed information
- Search recipes with advanced filtering by cuisine, difficulty, and preparation time
- Sort recipes by newest, most popular, or preparation time
- Featured recipes section highlighting premium content

User Interactions
- Like and unlike recipes with automatic count tracking
- Add recipes to favorites
- View user-specific favorite recipes
- Check like and favorite status for individual recipes

Subscription System
- Multiple subscription plans (Free, Premium, Lifetime)
- Plan management and retrieval
- Payment processing and transaction recording
- Automatic expiration handling for premium subscriptions
- Recipe limit enforcement based on subscription tier

Admin Features
- Dashboard overview with key metrics
- User management and blocking/unblocking capabilities
- Featured recipe toggling
- Report management and recipe deletion based on reports
- Transaction history tracking
- User, recipe, and report statistics

Recipe Reporting
- Users can report inappropriate recipes
- Admin review and action on reports
- Automatic recipe deletion when reports are approved

Tech Stack

Backend Framework: Node.js with Express.js 5.2.1
Database: MongoDB 7.3.0
Environment Management: dotenv 17.4.2
CORS Handling: cors 2.8.6
Development Tool: nodemon 3.1.14
Hosting: Vercel

Installation

Prerequisites

Node.js (v14 or higher)
npm or yarn package manager
MongoDB Atlas account or local MongoDB instance
Vercel account (for deployment)

Setup Instructions

Clone the repository to your local machine
git clone <repository-url>
cd flavor-flow-server

Install all project dependencies
npm install

Create a .env file in the project root directory with the following variables:
PORT=8000
MONGODB_URI=<your-mongodb-connection-string>

Verify the installation by checking if all dependencies are installed correctly
npm list

Running the Server

Development Mode

Start the server with nodemon for automatic restart on file changes:
npm run dev

The server will be available at http://localhost:8000

Production Mode

Start the server in production mode:
npm start

The server will be available at the configured PORT

Testing the Server

Visit http://localhost:8000 in your browser to see the "Hello, World!" message, confirming the server is running.

API Endpoints Reference

Base URL

Development: http://localhost:8000
Production: https://your-vercel-domain.vercel.app

Health Check

GET /

Response: "Hello, World!" (confirms server is running)

Recipe Endpoints

GET /recipes
Retrieve all recipes from the database

GET /api/recipes
Get recipes with filtering, sorting, and pagination
Query Parameters:
- search: Recipe name search term (regex)
- category: Filter by category
- cuisine: Filter by cuisine type
- difficulty: Filter by difficulty level
- prepTime: Filter by preparation time ranges
- sortBy: "newest", "popular", or "time-low"
- page: Page number for pagination

POST /api/recipes/publish
Create and publish a new recipe
Request Body: Recipe object with title, ingredients, instructions, preparation time, etc.

GET /api/recipes/:id
Get a single recipe by ID

PATCH /api/recipes/:id
Update an existing recipe by ID

DELETE /api/recipes/:id
Delete a recipe by ID

GET /api/feature&popularRecipe
Get featured and popular recipes
Returns the 6 most featured and 6 most popular recipes

Like and Unlike Endpoints

PATCH /api/recipes/:id/like
Like or unlike a recipe
Request Body:
{
  "action": "like" or "unlike",
  "userId": "user-id"
}

GET /api/recipes/:id/like-status
Check if a user has liked a specific recipe
Query Parameters:
- userId: The user ID to check

Favorites Endpoints

PATCH /api/recipes/:id/favorite
Add or remove a recipe from favorites
Request Body:
{
  "action": "favorite" or "unfavorite",
  "favRecipe": { favRecipe data }
}

GET /api/user/:userId/favorite-recipes
Get all favorite recipes for a specific user

DELETE /api/user/:userId/favorite-recipes/:recipeId
Remove a recipe from user favorites

GET /api/user/recipes/:id/favorite-status
Check if a recipe is in user's favorites
Query Parameters:
- userId: The user ID

GET /api/recipes/:id/favorites-count
Get the count of users who favorited a recipe

User Endpoints

GET /api/user/:userId/recipes
Get all recipes published by a specific user

PATCH /update/:userId
Update user profile and additional information

GET /api/users/total-users
Retrieve list of all users (admin endpoint)

Recipe Reporting Endpoints

POST /api/recipes/report
Report an inappropriate recipe
Request Body: Report details including reason and content

GET /api/reports/total-reports
Retrieve all reports (admin endpoint)

DELETE /api/reports/:reportId
Delete a specific report

DELETE /api/recipes/:recipeId/report/:reportId
Delete a recipe and its associated report

Subscription Endpoints

GET /api/subscription-plans
Retrieve all available subscription plans

POST /api/subscription-plans
Create a new subscription plan (admin)

POST /api/users/subscription/update
Update user subscription plan after payment
Request Body:
{
  "userEmail": "user@example.com",
  "userId": "user-id",
  "amount": 9.99,
  "transactionId": "transaction-id",
  "paymentStatus": "completed",
  "planId": "premium" or "lifetime"
}

Transaction Endpoints

GET /api/transactions/total-transactions
Retrieve all payment transactions

Admin Endpoints

GET /api/admin/:adminId/dashboard-overview
Get comprehensive admin dashboard statistics
Requires admin role
Returns: User count, recipe count, premium members, pending reports, most liked recipe, featured recipes count, latest user, and recent reports

PATCH /api/users/:id/toggle-block
Block or unblock a user account

PATCH /api/recipes/:id/toggle-featured
Toggle featured status for a recipe

Database Schema Overview

Collections in MongoDB

users (user)
- _id: ObjectId
- name: String
- email: String
- role: String (user, admin)
- plan: String (free, premium, lifetime)
- recipeLimit: Number
- expireAt: ISO String (for premium expiration)
- isBlocked: Boolean
- createdAt: ISO String
- updatedAt: ISO String

recipes
- _id: ObjectId
- recipeName: String
- category: String
- cuisineType: String
- difficultyLevel: String
- preparationTime: Number
- ingredients: Array
- instructions: String
- author: Object { id, name }
- likesCount: Number (default: 0)
- isFeatured: Boolean
- status: String (published, draft)
- createdAt: ISO String
- updatedAt: ISO String

likes
- _id: ObjectId
- recipeId: ObjectId
- userId: String
- Unique compound index on (recipeId, userId)

favorites
- _id: ObjectId
- recipeId: String or ObjectId
- userId: String
- Unique compound index on (recipeId, userId)

reports
- _id: ObjectId
- recipeId: ObjectId or String
- userId: String
- reason: String
- status: String (Pending, Reviewed)
- createdAt: ISO String

subscriptionPlans
- _id: ObjectId
- planId: String (free, premium, lifetime)
- name: String
- price: Number
- recipeLimit: Number
- features: Array
- duration: String

transactions
- _id: ObjectId
- userId: String
- userEmail: String
- amount: Number
- transactionId: String
- paymentStatus: String
- planId: String
- createdAt: ISO String

user_subscriptions
- _id: ObjectId
- userId: String
- plan: String
- expireAt: ISO String
- recipeLimit: Number
- createdAt: ISO String
- updatedAt: ISO String

Deployment

The project is configured for Vercel deployment using the vercel.json configuration file.

Vercel Configuration

- Build: Node.js runtime
- Entry point: index.js
- Routes: All requests directed to index.js

Deploy to Vercel

Install Vercel CLI:
npm install -g vercel

Deploy the project:
vercel

Set environment variables in Vercel dashboard:
- MONGODB_URI: Your MongoDB connection string
- PORT: 8000 or leave default

Environment Variables

Required Variables

PORT: Server port (default: 8000)
MONGODB_URI: MongoDB connection string with credentials

Example .env file:
PORT=8000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flavorflow?retryWrites=true&w=majority

Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (invalid input)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error

All error responses follow this format:
{
  "success": false,
  "message": "Error description"
}

Development Tips

Using Nodemon

The dev script uses nodemon for automatic server restart during development. Any file changes will automatically restart the server.

CORS Configuration

CORS is enabled for all origins. Modify the cors() call in index.js if you need to restrict access to specific domains.

MongoDB Connection

The server connects to MongoDB on startup. Ensure MONGODB_URI is correctly configured before running.

Database Indexes

Unique compound indexes are created for:
- Likes collection: (recipeId, userId)
- Favorites collection: (recipeId, userId)
These prevent duplicate entries for the same user-recipe combination.

Contributing

Contributions are welcome. Please follow these guidelines:

1. Create a new branch for each feature or fix
2. Write clear commit messages
3. Test your changes thoroughly
4. Submit a pull request with detailed description of changes

License

This project is licensed under the ISC License. See LICENSE file for details.

Support

For issues, bugs, or feature requests, please create an issue in the repository.
