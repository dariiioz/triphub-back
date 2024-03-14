let express = require("express");
let router = express.Router();
const Trip = require("../models/trip");
const User = require("../models/user");
const { checkBodyMiddleware } = require("../middlewares/checkBody");
const Country = require("../models/country-info");
const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

router.post(
  "/create",
  checkBodyMiddleware(["title", "country", "start_at", "end_at", "token"]),
  async (req, res) => {
    const { title, country, start_at, end_at, token } = req.body;

    // Check if the user is logged in and if the token is valid
    const userInfos = await User.findOne({ token: token }).populate("trips");
    if (!userInfos) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    //get country infos
    const countryInfos = await Country.findOne({ country: country });
    if (!countryInfos) {
      res.status(404).json({ message: "Country not found" });
      return;
    }

    // Check if the start date is before the end date
    const date_start = new Date(start_at);
    console.log(date_start);
    const date_end = new Date(end_at);
    if (date_start > date_end) {
      res.status(400).json({
        error: "Start date must be before end date",
      });
      return;
    }

    // Create the trip
    const newTrip = new Trip({
      title: title,
      country: country,
      start_at: date_start,
      end_at: date_end,
      createdBy: userInfos._id,
      invitation_link: generateInvitationCode(),
      sos_infos: countryInfos._id,
    });

    // Save the trip
    const trip = await newTrip.save();

    // Add the trip to the user's trips
    userInfos.trips.push(trip._id);

    await userInfos.save();

    const user = await User.findById(userInfos._id).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });

    res.status(200).json({ result: true, data: user.trips });
  }
);

router.get("/getTrips/:token", async (req, res) => {
  const token = req.params.token;

  // Check if the user is logged in and if the token is valid
  const userInfos = await User.findOne({ token }).populate({
    path: "trips",
    populate: { path: "sos_infos" },
  });
  if (!userInfos) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const updateUser = await User.findById(userInfos._id)
    .populate({
      path: "trips",
      populate: { path: "sos_infos" },
    })
    .populate({
      path: "trips",
      populate: { path: "shareWith" },
    });

  res.status(200).json({ result: true, data: updateUser.trips });
});

router.delete(
  "/delete",
  checkBodyMiddleware(["tripId", "token"]),
  async (req, res) => {
    const { tripId, token } = req.body;

    const user = await User.findOne({ token: token }).populate("trips");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // console.log(trip.createdBy.toString());
    // console.log(user._id.toString());
    // console.log(trip.shareWith.includes(user._id.toString()));
    // if (
    //   trip.createdBy.toString() != user._id.toString ||
    //   !trip.shareWith.includes(user._id.toString())
    // ) {
    //   return res.status(401).json({ error: "Unauthorized" });
    // }

    let result;
    if (trip.createdBy.toString() === user._id.toString()) {
      result = await Trip.findByIdAndDelete(tripId);
      await User.updateMany(
        { "shareWith.trip": tripId },
        { $pull: { shareWith: { trip: tripId } } }
      );
      await User.updateMany({ trips: tripId }, { $pull: { trips: tripId } });
    } else {
      trip.shareWith = trip.shareWith.filter(
        (userId) => userId.toString() !== user._id.toString()
      );
      await trip.save();
      await User.updateOne({ _id: user._id }, { $pull: { trips: tripId } });
    }

    const updatedUser = await User.findById(user._id).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });

    res.status(200).json({ result: true, data: updatedUser });

    // // Check if the user is a shared user trip
    // if (trip.shareWith.includes(user._id.toString())) {
    //   console.log("shared trip");
    //   trip.shareWith = trip.shareWith.filter(
    //     (userId) => userId.toString() !== user._id.toString()
    //   );
    //   await trip.save();

    //   console.log("user trips", user.trips[1]._id.toString());
    //   console.log("trip id", trip._id.toString());
    //   const userUpdate = await User.updateOne(
    //     { _id: user._id },
    //     { $pull: { trips: trip._id } }
    //   );

    //   userUpdate.save();

    //   const updatedUser = await User.findById(user._id).populate({
    //     path: "trips",
    //     populate: { path: "sos_infos" },
    //   });
    //   return res.status(200).json({ result: true, data: updatedUser.trips });
    // } else {
    //   await Trip.findByIdAndDelete(tripId);

    //   await User.updateMany(
    //     { "shareWith.trip": tripId },
    //     { $pull: { shareWith: { trip: tripId } } }
    //   );

    //   await User.updateMany({ trips: tripId }, { $pull: { trips: tripId } });

    //   const updatedUser = await User.findById(user._id).populate({
    //     path: "trips",
    //     populate: { path: "sos_infos" },
    //   });

    //   res.status(200).json({ result: true, data: updatedUser.trips });
    // }
  }
);

router.post(
  "/addActivity",
  checkBodyMiddleware(["tripId", "title", "plannedAt", "token"]),
  async (req, res) => {
    const { tripId, title, plannedAt, token, note, address } = req.body;

    // Check if the user is logged in and if the token is valid
    const user = await User.findOne({ token }).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // // Check if the trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    // Check if the user is the creator of the trip
    if (trip.createdBy.toString() !== user._id.toString()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Add the activity to the trip

    const date_plannedAt = new Date(plannedAt);
    trip.activities.push({
      title: title,
      plannedAt: date_plannedAt,
      notes: note,
      address: address,
    });

    // Save the trip
    await trip.save();

    const updatedUser = await User.findById(user._id).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });
    res.status(200).json({ result: true, data: updatedUser.trips });
  }
);

router.delete(
  "/deleteActivity",
  checkBodyMiddleware(["tripId", "activityId", "token"]),
  async (req, res) => {
    const { tripId, activityId, token } = req.body;

    // Check if the user is logged in and if the token is valid
    const user = await User.findOne({ token }).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check if the trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      res.status(404).json({ message: "Trip not found" });
      return;
    }

    // // Check if the user is the creator of the trip
    // if (trip.createdBy.toString() !== user._id.toString()) {
    //   res.status(401).json({ message: "Unauthorized" });
    //   return;
    // }

    // Delete the activity
    trip.activities = trip.activities.filter(
      (activity) => activity._id.toString() !== activityId.toString()
    );
    await trip.save();

    res.status(200).json({ result: true, trip: trip });
  }
);

router.put(
  "/editActivity",
  checkBodyMiddleware(["tripId", "activityId", "token"]),
  async (req, res) => {
    const { tripId, activityId, token, title, plannedAt, address, note } =
      req.body;

    // Check if the user is logged in and if the token is valid
    const user = await User.findOne({ token }).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if the trip exists

    const trip = await Trip.findById(tripId);

    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    // Check if the user is the creator of the trip
    if (trip.createdBy.toString() !== user._id.toString()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Edit the activity
    const activity = trip.activities.id(activityId);

    if (title) {
      activity.title = title;
    }

    if (plannedAt) {
      activity.plannedAt = new Date(plannedAt);
    }

    if (address) {
      activity.address = address;
    }

    if (note) {
      activity.notes = note;
    }

    // Save the trip

    await trip.save();

    const updateUser = await User.findById(user._id)
      .populate({
        path: "trips",
        populate: { path: "sos_infos" },
      })
      .populate({
        path: "trips",
        populate: { path: "shareWith" },
      });

    res.status(200).json({ result: true, data: updateUser.trips });
  }
);

router.put(
  "/addNote",
  checkBodyMiddleware(["tripId", "activityId", "note", "token"]),
  async (req, res) => {
    const { tripId, activityId, note, token } = req.body;

    // Check if the user is logged in and if the token is valid
    const user = await User.findOne({ token }).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check if the trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      res.status(404).json({ message: "Trip not found" });
      return;
    }

    // // Check if the user is the creator of the trip
    // if (trip.createdBy.toString() !== user._id.toString()) {
    //   res.status(401).json({ message: "Unauthorized" });
    //   return;
    // }

    // Add the note to the activity
    const activity = trip.activities.id(activityId);
    activity.notes.push(note);

    // Save the trip
    await trip.save();

    res.status(200).json({ result: true, trip: trip });
  }
);

router.delete(
  "/deleteNote",
  checkBodyMiddleware(["tripId", "activityId", "note", "token"]),
  async (req, res) => {
    const { tripId, activityId, note, token } = req.body;

    // Check if the user is logged in and if the token is valid
    const user = await User.findOne({ token }).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if the trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    // // Check if the user is the creator of the trip
    // if (trip.createdBy.toString() !== user._id.toString()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }

    // Remove the note from the activity
    const activity = trip.activities.id(activityId);
    activity.notes = activity.notes.filter((tripNote) => tripNote !== note);

    // Save the trip
    await trip.save();

    res.status(200).json({ result: true, trip: trip });
  }
);

router.put(
  "/join/:invitationCode",
  checkBodyMiddleware(["token"]),
  async (req, res) => {
    const invitCode = req.params.invitationCode;
    const { token } = req.body;

    // Check if the user is logged in and if the token is valid
    const user = await User.findOne({ token }).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if the trip exists
    const trip = await Trip.findOne({ invitation_link: invitCode });
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    // add the userID to the trip's shareWith
    trip.shareWith.push(user._id);
    await trip.save();

    // Add the trip to the user's trips
    user.trips.push(trip._id);
    await user.save();

    // Send the user's trips
    const updatedUser = await User.findById(user._id).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });
    res.status(200).json({ result: true, data: updatedUser.trips });
  }
);

router.post("/uploadImage", async (req, res) => {
  console.log(req.files);
  //Create temporary file with unique id for photo
  const photoPath = `./uploadImage/${uniqid()}.jpg`;

  //Attempt to move the file
  const resultMove = await req.files.photoFromFront.mv(photoPath);

  //If successful (move is empty)
  if (!resultMove) {
    const resultCloudinary = await cloudinary.uploader.upload(photoPath);

    //Deleting temporary photo file
    fs.unlinkSync(photoPath);
    res.json({ result: true, url: resultCloudinary.secure_url });
  } else {
    res.json({ result: false, error: resultMove });
  }
});

router.put(
  "/updateImage",
  checkBodyMiddleware(["tripId", "token", "background_url"]),
  async (req, res) => {
    const { tripId, token, background_url } = req.body;

    // Check if the user is logged in and if the token is valid
    const user = await User.findOne({
      token: token,
    }).populate({
      path: "trips",
      populate: { path: "sos_infos" },
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if the trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    // Update the trip's background_url
    trip.background_url = background_url;
    await trip.save();

    const updateUser = await User.findById(user._id)
      .populate({
        path: "trips",
        populate: { path: "sos_infos" },
      })
      .populate({
        path: "trips",
        populate: { path: "shareWith" },
      });

    res.status(200).json({ result: true, data: updateUser.trips });
  }
);

function generateInvitationCode(length = 8) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
}
module.exports = router;
