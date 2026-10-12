require('dotenv').config();
const mongoose = require('mongoose');
const { Video } = require('../models/video.model');

const seedVideo = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error(
        'MONGO_URI is missing. Set it to your StreamingApp MongoDB connection string.'
      );
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const video = {
      title: 'The Nights',
      description: 'Sample featured video for StreamFlix',
      thumbnailUrl: 'https://picsum.photos/seed/nights/800/450',
      s3Key: 'theNights.mp4',
      duration: 180,
      genre: 'Documentary',
      releaseYear: 2024,
      rating: 4.8,
      isFeatured: true,
      status: 'ready',
      uploadedBy: new mongoose.Types.ObjectId(
        '6acafe68ab40a91c09721e4f'
      ),
    };

    await Video.updateOne(
      { s3Key: video.s3Key },
      { $set: video },
      { upsert: true }
    );

    console.log('Sample video record saved successfully.');
  } catch (error) {
    console.error('Error seeding video:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedVideo();
```
