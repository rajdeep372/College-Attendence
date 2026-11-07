import mongoose from "mongoose";

const uri = "mongodb+srv://immanueltextile333_db_user:Rajdeep%4069@clusterraj.qmrfvd7.mongodb.net/";

async function cleanDatabase() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.collections();
  for (const col of collections) {
    const name = col.collectionName;
    console.log("Found collection:", name);

    if (["attendances", "routines", "leaves", "circulars"].includes(name)) {
      const res = await col.deleteMany({});
      console.log(`Cleared ${res.deletedCount} documents from ${name}`);
    }
  }

  // Clear demo / mock users generated for dev tests
  const usersCol = db.collection("users");
  const userRes = await usersCol.deleteMany({
    $or: [
      { clerkId: { $regex: /^student_demo_/ } },
      { clerkId: { $regex: /^student_cohort_/ } },
      { clerkId: { $regex: /^teacher_default_/ } },
      { clerkId: { $regex: /^teacher_seed_/ } },
      { email: { $regex: /@college\.edu$/ } },
    ],
  });
  console.log(`Cleared ${userRes.deletedCount} demo users from users collection.`);

  await mongoose.disconnect();
  console.log("MongoDB is 100% clean with zero mock records!");
}

cleanDatabase().catch(console.error);
