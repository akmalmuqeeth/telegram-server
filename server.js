var express = require('express');
var app = express();

// body parser to parse post body to JSON
var bodyParser = require('body-parser');
app.use(bodyParser.json());

// log events
var logger = require('nlogger').logger(module);

// authentication module
var passport = require('passport');
var passportLocal = require('passport-local');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');

app.use(cookieParser());
app.use(expressSession({
  secret : 'mySecretKey',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

/* register a serializeUser function, which tells passport which unique
 information from the user object it should use to create the cookie */
passport.serializeUser(function(user, done){
  logger.debug('serializing: ', user.id);
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  // query database to fetch the user based on id
  logger.debug('de-serializing: ', id);
  UserModel.findOne({id: id}, function(err, doc){
    done(null, doc);
  });
  
});

passport.use(new passportLocal.Strategy(function (username, password, done) {
  logger.info("username: ", username, "password", password);
  
  UserModel.findOne({id : username}, function(err, user){
      logger.debug(err, user);
      if(err) return done(err, null);
      if(!user) return done(null,null, "user not found");
      if(user.password == password) { //authentication successful
        done(null, user);
      } else { // authentication failed
        done(null, null, 'password not matched');
      } 
  });  
}));

var mongoose = require('mongoose');
/* connect creates default connection
you could also use mongoose.connect here, but that would create an
 internal default pool of connections*/
var db = mongoose.createConnection('mongodb://localhost/telegramDb');
// make meaning/description out of the data
var userSchema = mongoose.Schema(
    {
      id : String,
      password: String,
      name: String,
      email: String
    });
//a connection or a pipe to the db
var UserModel = db.model('User', userSchema);

var postSchema = mongoose.Schema(
  {
     author : String,
     body : String,
     date : Date
  });

var PostModel = db.model('Post', postSchema);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("Connected to telegramDb");
  // start the node server when the db is ready
  app.listen(3000, function() {
    console.log('Server started');
  });
});

// Route implementations
// get all users, supports login operation
app.get('/api/users/', function getAllUsers (req,res) {
    if(req.query.operation == 'login') {
      logger.info("attempting to login");
      // authenticate using passport's custom callback
      passport.authenticate('local', function(err, user, info) {
        if (err)
          return res.status(500).end(); 
        if (!user)
          return res.status(404).send(info);
        /* user is authenticated at this point but a cookie is not created, 
           use the login method in the request object to serialize the user 
           and create the cookie */
        req.logIn(user, function(err) { 
          if (err) { 
            return res.status(500).end();
          }
          var emberuser = makeEmberUser(user);
          logger.debug(emberuser);
          return res.send({users : [emberuser]});
        });
      })(req, res);
    } else { //return all users
       logger.debug("retrieving all users");
       UserModel.find({}, function(err, users){
        if(err) return res.status(500).end();
        var emberUsers = users.map(function(user) {
          return makeEmberUser(user);
        });
        return res.send({users : emberUsers});
       });
      
    }  
});

//get user by id
app.get('/api/users/:userId', function getUserById (req, res) {
  logger.info("attempting to retrieve user with userId: ", req.params.userId);
  UserModel.findOne({id : req.params.userId }, function(err, user) {
     if (err) return res.status(500).send('error getting user by id');
     return res.send({users : [user]});
  });
});

//add user
app.post('/api/users/', function addUser(req, res) {
  logger.info("attempting to add user with req: ", req.body);
  if (req.body) {
   var user = new UserModel({id:req.body.id,password:req.body.password, 
   	name: req.body.name, email : req.body.email});
   user.save(function(err, user){
     if(err) {
      logger.error(err);
      return res.status(500).end();
     }
     console.log("user saved successfully");
     //login the user
     req.logIn(user, function(err) { 
          if (err) { 
            return res.status(500).end();
          }
          return res.send({user: makeEmberUser(user)});
        });
   });
  } else {
    logger.error("failed to add user with req: " , req.body);
    res.status(404).end();    
  }
});

/* get all posts for user - if request has userId param then returns posts for
   the user */
app.get('/api/posts/', ensureAuthenticated, function getAllPosts(req,res){
  var userId = req.query.userId;
  if (userId) {
    PostModel.find({author: userId}, function(err, posts){
      if(err) return res.status(500).send('Error retrieving users posts');
      logger.info("retrieved user:", userId, "posts : ", posts);
      return res.send({posts : posts}); 
    });
  } else { //return all posts from all users
    PostModel.find({}, function(err, posts){
      if(err) return res.status(500).send('Error retrieving all posts');
      return res.send({posts : posts}); 
    });     
  }
});

//add a post
app.post('/api/post', ensureAuthenticated, function addPost(req, res){
  logger.info("attempting to add post : ", req.body);
  if(req.user.id != req.body.author) {
      logger.error("unauthorized post attempt by user: ",req.user.id);
    return res.status(403).send('you do not have permission to add post for ' +req.body.author);
  }
  var post = new PostModel({author: req.body.author, body:req.body.body, 
              date: Date.now()});
  post.save(function(err, user){
    if(err) {
      logger.error(err);
      return res.status(500).end();
     }
     logger.info("post successfully added , post : ", post);
     return res.send({post : post});
  });  
});

/* utility function to strip any sensitive information from the user object
   before passing it over the wire*/
function makeEmberUser(user) {
   return {username: user.id, email: user.email};
}

function ensureAuthenticated(req, res, next){
  logger.info("ensureAuthenticated");
  if(req.isAuthenticated()){
    next();
  } else {
    res.status(403).end();
  }
}