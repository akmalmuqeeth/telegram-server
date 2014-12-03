var express = require('express');
var app = express();

//temp data
var users = [{id:'akmal', password:'test',name: 'AM', email : 'a@m.com'},
{id:'bob', password:'test2',name: 'BOB rob', email : 'bob@r.com'}];
var posts = [{author: 'akmal', body:'my first post', date: Date.now()},
{author: 'akmal', body:'my second post', date: Date.now()},
{author: 'bob', body:'roberts first post', date: Date.now()}];

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
  var user = getUser(users, id);
  done(null, {id: id, name: user.name, email: user.email});
});

passport.use(new passportLocal.Strategy(function (username, password, done){
	logger.info("username: ", username, "password", password);
	var user = getUser(users, username);
  if(user && user.password == password) { //authentication successful
  	done(null, user);
  } else { // authentication failed
  	done(null, null, 'user not found');
  } 
}));

// Route implementations
// get all users, supports login operation
app.get('/api/users/', function getAllUsers (req,res) {
	if(req.query.operation == 'login'){
		logger.info("attempting to login");
      // authenticate using passport's custom callback
      passport.authenticate('local', function(err, user, info) {
      	if (err) { 
      		return res.status(500).end(); 
      	}
      	if (!user) { 
      		return res.status(404).end(); 
      	}
        // request's login method sets the cookie, using the serialize function
        req.logIn(user, function(err) { 
        	if (err) { 
        		return res.status(500).end();
        	}
        	return res.send({users : [user]});

        });
      })(req, res);

    } else { //return all users
    	logger.debug("retrieving all users");
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

/* get all posts for user 
   if request has userId param then returns posts for the user 
   	*/
app.get('/api/posts/', ensureAuthenticated, function getAllPosts(req,res){
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
app.post('/api/post', ensureAuthenticated, function addPost(req, res){
	logger.info("attempting to add post : ", req.body);

	if(req.user.id != req.body.author) {
		logger.error("failed to add post. user: ",req.body.author, "does not exist");
		return res.status(404).end();
	}

	var post = {author: req.body.author, body:req.body.body, 
		date: Date.now()};
		posts.push(post);
		logger.info("post successfully added , post : ", post);
		return res.send({post : post});
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

function ensureAuthenticated(req, res, next){
	logger.info("ensureAuthenticated");
	if(req.isAuthenticated()){
		next();
	} else {
		res.status(403).end();
	}
}

var server = app.listen(3000, function() {
	console.log('Listening on port %d', server.address().port);
});

