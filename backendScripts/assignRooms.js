// // Migration script to assign rooms to existing squads
// // Run this ONCE after updating your Squad schema
// // This assigns rooms to your existing 20 squads (12 per room)

// import Squad from '../models/Squad.js';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// async function assignRoomsToSquads() {
//   try {
//     // Connect to your database
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log('Connected to MongoDB');

//     // Get all squads sorted by registration date
//     const squads = await Squad.find({}).sort({ registeredAt: 1 });
//     console.log(`Found ${squads.length} squads`);

//     // Define maximum squads per room
//     const SQUADS_PER_ROOM = 12;
    
//     // Assign rooms based on registration order
//     for (let i = 0; i < squads.length; i++) {
//       const roomNumber = Math.floor(i / SQUADS_PER_ROOM) + 1;
//       const roomName = `Room ${roomNumber}`;
      
//       squads[i].room = roomName;
//       await squads[i].save({ validateBeforeSave: false }); // Skip pre-save hooks
      
//       console.log(`✅ Assigned ${squads[i].squadName} to ${roomName}`);
//     }

//     console.log('\n🎉 Room assignment complete!');
//     console.log(`Total rooms created: ${Math.ceil(squads.length / SQUADS_PER_ROOM)}`);
    
//     // Show room distribution
//     const roomCounts = {};
//     squads.forEach(squad => {
//       roomCounts[squad.room] = (roomCounts[squad.room] || 0) + 1;
//     });
    
//     console.log('\n📊 Room Distribution (Max 12 per room):');
//     Object.entries(roomCounts).forEach(([room, count]) => {
//       console.log(`  ${room}: ${count} squads`);
//     });

//   } catch (error) {
//     console.error('❌ Error:', error);
//   } finally {
//     await mongoose.connection.close();
//     console.log('\nDatabase connection closed');
//   }
// }

// // Run the migration
// assignRoomsToSquads();

// /* 
// With 20 squads and 12 per room, you'll get:
// - Room 1: 12 squads (Squad 1-12)
// - Room 2: 8 squads (Squad 13-20)

// New squads registered after this will automatically be assigned to Room 2
// until it reaches 12, then Room 3 will be created, and so on.
// */