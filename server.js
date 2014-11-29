var express = require('express');
var app = express();
// body parser to parse post body to JSON
var bodyParser = require('body-parser');
app.use(bodyParser.json());

// logger to log events
var logger = require('nlogger').logger(module);

//temp data
var users = [{id:'akmal', password:'test',name: 'AM', email : 'a@m.com'},
  {id:'bob', password:'test2',name: 'BOB rob', email : 'bob@r.com'}];
var posts = [{author: 'akmal', body:'my first post', date: Date.now()},
  {author: 'akmal', body:'my second post', date: Date.now()},
  {author: 'bob', body:'roberts first post', date: Date.now()}];

// Route implementations
// get all users, supports login operation
app.get('/api/users/', function getAllUsers (req,res) {
  var operation = req.query.operation;
  if(operation && operation == 'login') {
    logger.info("attempting login . username: ",
        req.query.username, " password: ", req.query.password);
    var user = getUser(users, req.query.username);
    if( user && user.password  == req.query.password) {
      logger.info('login successful. User : ', user);
      return res.send({users : [user]});
    } else {
      logger.error('login failed for username: ', req.query.username);
      res.status(404).end();
    }
  } else { // return all the users
    logger.info("retrieved users: ", users);
    return res.send({users : users});
  }
});

//get user by id
app.get('/api/users/:userId', function getUserById (req, res) {
  logger.info("attempting to retrieve user with userId: ", req.params.userId);
  var user = getUser(users, req.params.userId)
  if (user) {
    logger.info("retrieved user: ", user);
    return res.send({users : [user]});
  } else {
    logger.error('getUserById. failed to retrieve user', req.params.userId);
    res.status(404).end();
  }
});

//add user
app.post('/api/users/', function addUser(req, res){
  logger.info("attempting to add user with req: ", req.body);
  if (req.body) {
   var user = {id:req.body.id, password:req.body.password,
              name: req.body.name, email : req.body.email};
   users.push(user);
   logger.info("user added successfully : ", user);
   return res.send({user: user});
  } else {
    logger.error("failed to add user with req: " , req.body);
    res.status(404).end();    
  }
});

//get all posts for user
app.get('/api/posts/', function getAllPosts(req,res){
  var result = {posts : []};
  var userId = req.query.userId;
  if (userId) {
    for ( var i=0; i< posts.length; i++ ) {
      if( posts[i].author === userId) {
        result.posts.push(posts[i]);
    }
  }
  logger.info("retrieved user:", userId, "posts : ", result.posts);
  return res.send(result);
  } else {
    logger.info("retreived all posts", posts);
    return res.send({posts : posts});  
  }
});

//add a post
app.post('/api/post', function addPost(req, res){
  logger.info("attempting to add post : ", req.body);
  //if no user exists, return 404
  var user = getUser(users, req.body.author);
  if (!user) {
    logger.error("failed to add post. user: "
      ,req.body.author, "does not exist");
    res.status(404).end();
    return;
  }
  var post = {author: req.body.author, body:req.body.body, 
              date: Date.now()};
  posts.push(post);
  logger.info("post successfully added , post : ", post);
  return res.send({posts : [post]});
});

var getUser = function ( users, userId ) {
  for ( var i=0; i<users.length; i++ ) {
    var result = {};
    if (users[i].id === userId) {
    return users[i];
    }
  }
  return null;
}

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});

