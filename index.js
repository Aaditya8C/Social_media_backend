// Import necessary modules
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Initialize Express app
const app = express();
const PORT = 5000;

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://vedantkale8114:F9bY8J0HByHyBfB2@cluster0.ptbo0km.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const User = mongoose.model("User", {
  userId: String, // MetaMask user ID
  name: String,
  image: String,
  followers:Number,
});

// Define schemas
const Post = mongoose.model("Post", {
  userId: String,
  contentType: String,
  content: String,
  description: String,
  likes: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  comments: [{ type: mongoose.Types.ObjectId, ref: "Comment" }],
});

const Comment = mongoose.model("Comment", {
  postId: mongoose.Types.ObjectId,
  owner: String,
  content: String,
});

app.use(cors());
app.use(express.json());

// API to create a new user
app.post("/api/users", async (req, res) => {
  try {
    const { userId, name, image } = req.body;

    const existingUser = await User.findOne({ userId });
    const totalPosts1 = await Post.countDocuments({ userId });
    if (existingUser) {
      return res.status(200).json({
        data: existingUser,
        totalPosts: totalPosts1,
        error: "User already exists",
      });
    }

    const newUser = new User({
      userId,
      name,
      image,
      followers:Math.floor(Math.random() * 100) + 1
    });

    await newUser.save();

    const newUserData = await User.findOne({ userId });

    const totalPosts = await Post.countDocuments({ userId });

    res.status(201).json({
      data: newUserData,
      totalPosts: totalPosts,
      message: "User created successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const { userId, contentType, content, description } = req.body;

    if (!userId || !contentType || !content || !description) {
      res.status(500).json({ error: "Fields are missing!!" });
      return;
    }

    const post = new Post({
      userId,
      contentType,
      content,
      description,
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// API to fetch all posts
app.get("/api/posts", async (req, res) => {
  try {
    const allPosts = await Post.find().populate("comments");
    const populatedPosts = await Promise.all(
      allPosts.map(async (post) => {
        const user = await User.findOne({ userId: post.userId });
        const populatedComments = await Promise.all(
          post.comments.map(async (commentId) => {
            const comment = await Comment.findById(commentId);
            if (comment) {
              const commentOwner = await User.findOne({
                userId: comment.owner,
              });
              return {
                ...comment.toObject(),
                owner: commentOwner
                  ? { name: commentOwner.name, image: commentOwner.image }
                  : null,
              };
            }
            return null;
          })
        );
        return {
          ...post.toObject(),
          user: user ? { name: user.name, image: user.image } : null,
          comments: populatedComments.filter((comment) => comment !== null),
        };
      })
    );
    res.status(200).json(populatedPosts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// API to fetch user's posts
app.get("/api/posts/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const userPosts = await Post.find({ userId }).populate("comments");
    const populatedUserPosts = await Promise.all(
      userPosts.map(async (post) => {
        const user = await User.findOne({ userId: post.userId });
        const populatedComments = await Promise.all(
          post.comments.map(async (commentId) => {
            const comment = await Comment.findById(commentId);
            if (comment) {
              const commentOwner = await User.findOne({
                userId: comment.owner,
              });
              return {
                ...comment.toObject(),
                owner: commentOwner
                  ? { name: commentOwner.name, image: commentOwner.image }
                  : null,
              };
            }
            return null;
          })
        );
        return {
          ...post.toObject(),
          user: user ? { name: user.name, image: user.image } : null,
          comments: populatedComments.filter((comment) => comment !== null),
        };
      })
    );
    res.status(200).json(populatedUserPosts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// API to add like to a post
app.post("/api/posts/:postId/like", async (req, res) => {
  try {
    const postId = req.params.postId;
    const { userId } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const indexOfUser = post.likes.indexOf(userId);
    if (indexOfUser !== -1) {
      post.likes.splice(indexOfUser, 1);
      post.likes.unshift(userId);
    } else {
      post.likes.unshift(userId);
    }

    await post.save();

    res.status(200).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// API to add comment to a post
app.post("/api/posts/:postId/comment", async (req, res) => {
  try {
    const postId = req.params.postId;
    const { owner, content } = req.body;

    // Create a new comment
    const newComment = new Comment({
      postId,
      owner,
      content,
    });

    await newComment.save();

    // Add comment to the post
    await Post.findByIdAndUpdate(postId, {
      $push: { comments: newComment._id },
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/users/:userId/total-likes", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find all posts for the user
    const userPosts = await Post.find({ userId });

    // Calculate total likes count across all posts
    let totalLikesCount = 0;
    userPosts.forEach((post) => {
      totalLikesCount += post.likes.length;
    });

    res.status(200).json({ totalLikesCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
