require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ================= CONFIG ================= */
// Fallbacks for quick start ONLY
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:f**ku@198.20.103.218:28011/testing?authSource=admin"; // change in production
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "lifecare-ro-systems-secret-key-change-in-production"; // change in production

/* ================= DB ================= */
mongoose.plugin((schema) => {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      return ret;
    }
  });
  schema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      return ret;
    }
  });
});

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));


/* ================= MODELS ================= */
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    name: String,
    phone: String,
    password: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  }),
);

const Product = mongoose.model(
  "Product",
  new mongoose.Schema({
    product_id: { type: String, unique: true },
    name: String,
    description: String,
    price: String,
    category: { type: String, enum: ["water", "air"] },
    specs: { type: Array, default: [] },
    badge: String,
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  }),
);

const Order = mongoose.model(
  "Order",
  new mongoose.Schema({
    order_id: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    product_id: String,
    product_name: String,
    amount: String,
    payment_mode: { type: String, enum: ["cash", "upi"], default: "cash" },
    status: {
      type: String,
      enum: ["pending", "processing", "delivered", "cancelled"],
      default: "pending",
    },
    notes: String,
    created_at: { type: Date, default: Date.now },
  }),
);
const AMC = mongoose.model(
  "AMC",
  new mongoose.Schema({
    amc_id: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    product_id: String,
    product_name: String,
    start_date: Date,
    end_date: Date,
    next_service: Date,
    amount: String,
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    created_at: { type: Date, default: Date.now },
  }),
);

const Contact = mongoose.model(
  "Contact",
  new mongoose.Schema(
    {
      name: String,
      email: String,
      phone: String,
      message: String,
      status: { type: String, default: "pending" },
      ip_address: String,
    },
    { timestamps: true },
  ),
);

const Brochure = mongoose.model(
  "Brochure",
  new mongoose.Schema({
    brochure_type: String,
    count: { type: Number, default: 0 },
  }),
);

const generateTokens = (user) => {
  const access = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "1d",
  });

  const refresh = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

  return { access, refresh };
};

/* ================= MIDDLEWARE ================= */
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

const admin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};
/* ================= AUTH ================= */
app.post("/api/auth/register/", async (req, res) => {
  const { username, email, password, name, phone } = req.body;

  try {
    // Check uniqueness of email
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: "Email is already registered" });
      }
    }

    // Check uniqueness of phone
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res
          .status(400)
          .json({ error: "Phone number is already registered" });
      }
    }

    // Check uniqueness of username
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ error: "Username is already taken" });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hash,
      name,
      phone,
    });

    const { access, refresh } = generateTokens(user);

    res.status(201).json({
      access,
      refresh,
      user,
      message: "Registration successful",
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: "Registration failed. Please try again." });
  }
});

app.post("/api/auth/login/", async (req, res) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ error: "Invalid credentials password" });

  if (!user.is_active)
    return res.status(403).json({ error: "Account is disabled" });

  const { access, refresh } = generateTokens(user);

  res.json({
    access,
    refresh,
    user,
    message: "Login successful",
  });
});

app.post("/api/auth/token/refresh/", async (req, res) => {
  const { refresh } = req.body;

  if (!refresh) return res.status(400).json({ error: "No refresh token" });

  try {
    const decoded = jwt.verify(refresh, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "Invalid refresh token" });

    const access = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ access });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

app.get("/api/auth/me/", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
});
/* ================= USERS ================= */
// USERS
app.get("/api/users/", auth, admin, async (req, res) => {
  res.json(await User.find().sort({ created_at: -1 }));
});

app.post("/api/users/", auth, admin, async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ ...req.body, password: hash });
  res.json(user);
});

app.get("/api/users/:id/", auth, admin, async (req, res) => {
  res.json(await User.findById(req.params.id));
});

app.patch("/api/users/:id/", auth, admin, async (req, res) => {
  res.json(
    await User.findByIdAndUpdate(req.params.id, req.body, { new: true }),
  );
});

app.delete("/api/users/:id/", auth, admin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* ================= PRODUCTS ================= */
app.get("/api/products/", async (req, res) => {
  res.json(await Product.find({ is_active: true }));
});

app.post("/api/products/", auth, admin, async (req, res) => {
  res.json(await Product.create(req.body));
});

app.get("/api/products/:id/", async (req, res) => {
  res.json(await Product.findById(req.params.id));
});

app.patch("/api/products/:id/", auth, admin, async (req, res) => {
  res.json(
    await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }),
  );
});

app.delete("/api/products/:id/", auth, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});
/* ================= ORDERS ================= */
app.get("/api/orders/", auth, async (req, res) => {
  if (req.user.role === "admin") {
    return res.json(await Order.find().sort({ created_at: -1 }));
  }
  res.json(await Order.find({ user: req.user.id }));
});

app.post("/api/orders/", auth, admin, async (req, res) => {
  try {
    let userId = req.body.user;

    // 🔁 Convert username/email → ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findOne({
        $or: [{ username: userId }, { email: userId }],
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid user" });
      }

      userId = user._id;
    }

    const order = await Order.create({
      ...req.body,
      user: userId,
      createdAt: new Date(),
    });

    res.status(201).json(order);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: "Invalid data" });
  }
});
app.get("/api/orders/:id/", auth, async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (req.user.role !== "admin" && order.user.toString() !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(order);
});

app.patch("/api/orders/:id/", auth, admin, async (req, res) => {
  res.json(
    await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }),
  );
});

app.get("/api/orders/product/:product_id/", auth, admin, async (req, res) => {
  res.json(await Order.find({ product_id: req.params.product_id }));
});
/* ================= AMC ================= */
/* ================= AMC (Django Equivalent) ================= */

// 1️⃣ LIST + AUTO EXPIRE — GET /api/amc/
app.get("/api/amc/", auth, async (req, res) => {
  try {
    const today = new Date();

    // Auto-expire (same as Django)
    await AMC.updateMany(
      { end_date: { $lt: today }, status: "active" },
      { $set: { status: "expired" } },
    );

    let data;
    if (req.user.role === "admin") {
      data = await AMC.find().sort({ created_at: -1 });
    } else {
      data = await AMC.find({ user: req.user.id }).sort({ created_at: -1 });
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// 2️⃣ CREATE — POST /api/amc/ (Admin)
app.post("/api/amc/", auth, admin, async (req, res) => {
  try {
    let userId = req.body.user;

    // If not ObjectId, try finding user
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findOne({
        $or: [{ username: userId }, { email: userId }],
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid user" });
      }

      userId = user._id;
    }

    const amc = await AMC.create({
      ...req.body,
      user: userId,
      status: req.body.status || "active",
      created_at: new Date(),
    });

    res.status(201).json(amc);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: "Invalid data" });
  }
});

// 3️⃣ DETAIL — GET /api/amc/:id/ (Admin)
app.get("/api/amc/:id/", auth, admin, async (req, res) => {
  try {
    const amc = await AMC.findById(req.params.id);

    if (!amc) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(amc);
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// 4️⃣ UPDATE — PATCH /api/amc/:id/ (Admin)
app.patch("/api/amc/:id/", auth, admin, async (req, res) => {
  try {
    const updated = await AMC.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(updated);
  } catch {
    res.status(400).json({ error: "Invalid update" });
  }
});

// 5️⃣ DELETE — DELETE /api/amc/:id/ (Admin)
app.delete("/api/amc/:id/", auth, admin, async (req, res) => {
  try {
    const deleted = await AMC.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ message: "Deleted" });
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

/* ================= CONTACT ================= */
/* ================= CONTACT (Django Equivalent) ================= */

// 1️⃣ CREATE — POST /api/contact/ (Public)
app.post("/api/contact/", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const contact = await Contact.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      message: req.body.message,
      ip_address: ip,
      status: "pending",
    });

    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
});

// 2️⃣ LIST — GET /api/contact/list/ (Admin)
app.get("/api/contact/list/", auth, admin, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// 3️⃣ DETAIL — GET /api/contact/:id/ (Admin)
app.get("/api/contact/:id/", auth, admin, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(contact);
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// 4️⃣ UPDATE — PATCH /api/contact/:id/ (Admin)
app.patch("/api/contact/:id/", auth, admin, async (req, res) => {
  try {
    const updated = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(updated);
  } catch {
    res.status(400).json({ error: "Invalid update" });
  }
});

// 5️⃣ DELETE — DELETE /api/contact/:id/ (Admin)
app.delete("/api/contact/:id/", auth, admin, async (req, res) => {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ message: "Deleted" });
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});
/* ================= BROCHURE ================= */
app.post("/api/brochure/download/:brochure_type/", async (req, res) => {
  const type = req.params.brochure_type;

  if (!["water", "air"].includes(type)) {
    return res.status(400).json({ error: "Invalid brochure type" });
  }

  let obj = await Brochure.findOne({ brochure_type: type });
  if (!obj) obj = await Brochure.create({ brochure_type: type });

  obj.count++;
  obj.last_download = new Date();
  await obj.save();

  res.json({
    brochure_type: type,
    count: obj.count,
    message: `Download tracked. Total: ${obj.count}`,
  });
});

app.get("/api/brochure/counts", async (req, res) => {
  const data = {};
  const all = await Brochure.find();
  all.forEach((x) => (data[x.brochure_type] = x.count));
  res.json(data);
});

/* ================= DASHBOARD ================= */
app.get("/api/admin/dashboard/", auth, admin, async (req, res) => {
  try {
    const today = new Date();

    // 1️⃣ Auto-update expired AMC (same as Django)
    await AMC.updateMany(
      { end_date: { $lt: today }, status: "active" },
      { $set: { status: "expired" } },
    );

    // 2️⃣ Brochure downloads (same structure)
    const brochureDocs = await Brochure.find();
    const brochure_downloads = {};
    brochureDocs.forEach((obj) => {
      brochure_downloads[obj.brochure_type] = obj.count;
    });

    // 3️⃣ Recent orders (last 5, newest first)
    const recent_orders = await Order.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      total_users: await User.countDocuments({ role: "user" }),
      total_orders: await Order.countDocuments(),
      active_amc: await AMC.countDocuments({ status: "active" }),
      expired_amc: await AMC.countDocuments({ status: "expired" }),
      pending_contacts: await Contact.countDocuments({ status: "pending" }),
      resolved_contacts: await Contact.countDocuments({ status: "resolved" }),
      brochure_downloads,
      recent_orders,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
