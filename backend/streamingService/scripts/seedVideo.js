```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const { Video } = require('../models/video.model');

const seedVideo = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/streamingapp'
    );

    console.log('Connected to MongoDB');

    const adminId = new mongoose.Types.ObjectId();

    const video = {
      title: 'The Nights',
      description: 'Sample featured music video for StreamFlix',
      thumbnailUrl: 'https://picsum.photos/seed/nights/800/450',
      s3Key: 'theNights.mp4',
      duration: 180,
      genre: 'Documentary',
      releaseYear: 2024,
      rating: 4.8,
      isFeatured: true,
      status: 'ready',
      uploadedBy: adminId,
    };

    await Video.updateOne(
      { s3Key: video.s3Key },
      { $setOnInsert: video },
      { upsert: true }
    );

    console.log('Sample video record created or already exists.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding video:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

seedVideo();
```
