const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb')

module.exports = async (mclient, req, res, JWTsecret) => {
  try {
    // Extract the token from the Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if(!token){ return res.status(401).send({ error: "No token provided" }); }

    // Verify the token
    const decoded = jwt.verify(token, JWTsecret);
    if(!decoded){return res.status(401).send({ error: "Token invalid" }); }

    

    // Fetch the user from the database
    const db = mclient.db("my-pregnancy-dev");
    const users = db.collection("users");
    const user = await users.findOne({ email: decoded.email });
    if(!user){ return res.status(404).send({ error: "User not found" }); }

    const consultationRequestsCollection = db.collection("consultation-requests");

    const { consultationid, newstatus } = req.body;

    // fetch consultation by id and ensure it exists
    const consultation = await consultationRequestsCollection.findOne({ _id: new ObjectId(consultationid) });
    if(!consultation){ return res.status(404).send({ error: "Consultation not found" }); }

    // validate new state is valid
    const validStatus= ["accepted", "rejected", "completed", "cancelled", "clear"];
    if(!validStatus.includes(newstatus)){ return res.status(400).send({ error: "Invalid state value" }); }
    if(consultation.status === "pending"){
      if(newstatus === "completed"){ return res.status(400).send({ error: "Invalid state value" }); }
    }
    if(consultation.status === "accepted"){
      if(newstatus === "rejected"){ return res.status(400).send({ error: "Invalid state value" }); }
    }

    if(newstatus === "clear"){
      if(user.role === "pregnant"){
        await consultationRequestsCollection.updateOne({ _id: new ObjectId(consultationid) }, { $set: { pregnantCleared: true } });
        return res.status(200).send({ message: `Successfully cleared consultation` });
      }
      if(user.role === "doctor"){
        await consultationRequestsCollection.updateOne({ _id: new ObjectId(consultationid) }, { $set: { doctorCleared: true } });
        return res.status(200).send({ message: `Successfully cleared consultation` });
      }
      return;
    }

    // update consultation request with new state
    const result = await consultationRequestsCollection.updateOne({ _id: new ObjectId(consultationid) }, { $set: { status: newstatus } });

    // check if update was successful
    if(result.modifiedCount === 0){ return res.status(400).send({ error: "State not changed" }); }

    // send success msg
    res.status(200).send({ message: `Successfully ${newstatus} consultation` });

    if(newstatus === "accepted"){
      const notificationsCollection = db.collection("notifications");

      // Calculate the notification time as 15 minutes before the consultation date
      const notificationTime = consultation.date - (15 * 60 * 1000); // 15 minutes in milliseconds

      // Create a new notification document
      const notification = {
        doctorID: consultation.doctorId, // Adjust as needed
        notificationText: `You have an upcoming consultation booking in 15 minutes`,
        date: new Date(notificationTime).toISOString(),
        link: "/consultation/manage"
      };

      // Insert the notification into the notifications collection
      await notificationsCollection.insertOne(notification);
    }

  } catch (err) {
    console.log(err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      res.status(401).send({ error: "Token is invalid or expired" });
    } else {
      res.status(500).send({ error: "Internal Server Error" });
    }
  }
};
