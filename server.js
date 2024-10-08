// CHECK THAT THE CONFIG.JS IS THE SAME AS WHAT IT IS ON DISCORD IF YOU GET ERRORS

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

const register = require('./functions/register.js'); 
const login = require('./functions/login.js'); 
const getUser = require('./functions/getUser.js');
const updateUser = require('./functions/updateUser.js');
const updateUserPhoto = require('./functions/updateUserPhoto.js');
const deleteUserPhoto = require('./functions/deleteUserPhoto.js');

const newJournalEntry = require('./functions/journal/newJournalEntry.js');
const getAllJournalEntries = require('./functions/journal/getAllEntries.js');

const getAllFitnessVideos = require('./functions/fitness/getAllFitnessVideos.js');
const getUserPostedVideos = require('./functions/fitness/getUserPostedVideos.js');
const postUserVideo = require('./functions/fitness/postUserVideo.js');
const deleteUserVideo = require('./functions/fitness/deleteUserVideo.js');

const getAllDoctors = require('./functions/consultation/getAllDoctors.js');
const newConsultationRequest = require('./functions/consultation/newConsultationRequest.js');
const getExistingConsultationRequests = require('./functions/consultation/getExistingConsultationRequests.js');
const updateConsultationState = require('./functions/consultation/updateConsultationState.js');

const getForumsHome = require('./functions/forums/getForumsHome.js');
const getAllForumsInCategory = require('./functions/forums/getAllForumsInCategory.js');
const getPost = require('./functions/forums/getPost.js');
const addReply = require('./functions/forums/addReply.js');
const createPost = require('./functions/forums/createPost.js');

const getNotifications = require('./functions/notification/getNotifications.js');
const clearNotification = require('./functions/notification/clearNotification.js');
const clearAllNotifications = require('./functions/notification/clearAllNotifications.js');

const getAllChecklists = require('./functions/checklist/getAllChecklists.js');
const createChecklist = require('./functions/checklist/newChecklist.js');
const deleteChecklist = require('./functions/checklist/deleteChecklist.js');

const getAllResources = require('./functions/resources/getAllResources.js');
const getUserPostedResources = require('./functions/resources/getUserPostedResources.js');
const postUserResource = require('./functions/resources/postUserResource.js');
const deleteUserResource  = require('./functions/resources/deleteUserResource.js');

const PORT = 8000;

//mongo
const {MongoClient} = require('mongodb');
const mclient = new MongoClient(config.mongoURL);
async function connectMongo(){
  try {
    await mclient.connect();
  } catch(err) {
    console.log(err)
  } finally {
    console.log('connected to mongo')
  }
}
connectMongo()

//express
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(500).json({ error: true, errorMsg: 'Malformed JSON' });
      throw new Error('Malformed JSON');
    }
  }
}));

app.use((err, req, res, next) => {
  if (res.headersSent) { return next(err); }
  res.status(500).json({ error: true, errorMsg: 'Malformed JSON' });
});

app.use(cors())
app.listen(PORT, () => { console.log(`express server active, http://localhost:${PORT}`); });

const Minio = require('minio');
const minioClient = new Minio.Client({
  endPoint: config.minioURL,
  port: 9000,
  useSSL: false,
  accessKey: config.minioUsr,
  secretKey: config.minioPwd
});

app.get('//test', async (req, res) => { res.sendStatus(200); });

app.post('//register', async (req,res) => { register(mclient, req, res, config.JWTsecret); });
app.post('//login', async (req,res) => { login(mclient, req, res, config.JWTsecret); });
app.get('//getuser', async (req,res) => { getUser(mclient, req, res, config.JWTsecret, minioClient); });
app.post('//updateuser', async (req,res) => { updateUser(mclient, req, res, config.JWTsecret); });
app.post('//updateuserphoto', async (req,res) => { updateUserPhoto(mclient, req, res, config.JWTsecret, minioClient); });
app.post('//deleteuserphoto', async (req,res) => { deleteUserPhoto(mclient, req, res, config.JWTsecret); });

app.post('//journal/newentry', async (req,res) => { newJournalEntry(mclient, req, res, config.JWTsecret); });
app.get('//journal/allentries', async (req,res) => { getAllJournalEntries(mclient, req, res, config.JWTsecret); });

app.get('//fitness/allvideos', async (req,res) => { getAllFitnessVideos(mclient, req, res); });
app.get('//fitness/uservideos', async (req, res) => { getUserPostedVideos(mclient, req, res, config.JWTsecret); });
app.post('//fitness/postvideo', async (req, res) => { postUserVideo(mclient, req, res, config.JWTsecret); });
app.post('//fitness/deletevideo', async (req, res) => { deleteUserVideo(mclient, req, res, config.JWTsecret); });

app.get('//consultation/alldoctors', async (req,res) => { getAllDoctors(mclient, req, res, minioClient); });
app.post('//consultation/newrequest', async (req,res) => { newConsultationRequest(mclient, req, res, config.JWTsecret); });
app.get('//consultation/getexisting', async (req,res) => { getExistingConsultationRequests(mclient, req, res, config.JWTsecret); });
app.post('//consultation/updatestate', async (req,res) => { updateConsultationState(mclient, req, res, config.JWTsecret); });

app.get('//forums/gethome', async (req,res) => { getForumsHome(mclient, res, minioClient); });
app.get('//forums/getcategory', async (req,res) => { getAllForumsInCategory(mclient, req, res, minioClient); });
app.get('//forums/getpost', async (req,res) => { getPost(mclient, req, res, minioClient); });
app.post('//forums/reply', async (req,res) => { addReply(mclient, req, res, config.JWTsecret); });
app.post('//forums/create', async (req,res) => { createPost(mclient, req, res, config.JWTsecret); });

app.get('//notifications/get', async (req,res) => { getNotifications(mclient, req, res, config.JWTsecret); });
app.post('//notifications/clear', async (req,res) => { clearNotification(mclient, req, res, config.JWTsecret); });
app.post('//notifications/clearall', async (req,res) => { clearAllNotifications(mclient, req, res, config.JWTsecret); });

app.get('//checklist/all', async (req, res) => { getAllChecklists(mclient, res); });
app.post('/checklist/create', (req, res) => createChecklist(mclient, req, res, config.JWTsecret));
app.post('/checklist/update/:id', (req, res) => { updateChecklist(mclient, req, res, config.JWTsecret); });
app.post('/checklist/delete/:id', (req, res) => { deleteChecklist(mclient, req, res, config.JWTsecret); });

app.get('//resources', async (req,res) => { getAllResources(mclient, req, res, minioClient); });
app.get('//resources/userresources', async (req, res) => { getUserPostedResources(mclient, req, res, config.JWTsecret); });
app.post('//resources/postresource', async (req, res) => { postUserResource(mclient, req, res, config.JWTsecret); });
app.post('//resources/deleteresource', async (req, res) => { deleteUserResource(mclient, req, res, config.JWTsecret); });
