var express = require('express');
var app = express();
// body parser to parse post body to JSON
var bodyParser = require('body-parser');
app.use(bodyParser.json());

//temp data
var users = [{id:'akmal', password:'test',name: 'AM', email : 'a@m.com'},
  {id:'bob', password:'test2',name: 'BOB rob', email : 'bob@r.com'}];
var posts = [{author: 'akmal', body:'my first post', date: Date.now()},
  {author: 'akmal', body:'my second post', date: Date.now()},
  {author: 'bob', body:'roberts first post', date: Date.now()}];

// Route implementations
// get all users, supports login operation
app.get('/api/users/', function getAllUsers(req,res){
  var operation = req.query.operation;
  if(operation && operation == 'login') {
    var user = getUser(users, req.query.username);
      if( user && user.password  == req.query.password) {
	    return res.send({users : [user]});
	  } else {
	    res.status(404).end();
	  }
    } else { // return all the users
      return res.send({users : users});
	}
});

//get user by id
app.get('/api/users/:userId', function getUserById(req, res) {
  var user = getUser(users, req.params.userId)
  if (user) {
    return res.send({users : [user]});
  } else {
    res.status(404).end();
  }
});

//add user
app.post('/api/users/', function addUser(req, res){
  if (req.body) {
   var user = {id:req.body.id, password:req.body.password,
              name: req.body.name, email : req.body.email};
   users.push(user);
   return res.send({user: user});
  }
  res.status(200).end();
});

//get all posts for user
app.get('/api/posts/', function getAllPosts(req,res){
  var result = {posts : []};
  var userId = req.query.userId;
  if (userId) {
    for ( var i=0; i< posts.length; i++) {
      if(posts[i].author == userId){
        result.posts.push(posts[i]);
    }
  }
  return res.send(result);
  } else {
    return res.send({posts : posts});	
  }
});

//add a post
app.post('/api/post', function addPost(req, res){
  //if no user exists, return 404
  var user = getUser(users, req.body.author);
  if (!user){
    res.status(404).end();
    return;
  }
  var post = {author: req.body.author, body:req.body.body, 
              date: Date.now()};
  posts.push(post);
  return res.send({posts : [post]});
});

var getUser = function ( users, userId ) {
  for ( var i=0; i<users.length; i++) {
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

