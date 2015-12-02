var express = require('express');
var router = express.Router();
var moment = require('moment');
var session = require('express-session');

/* Set up database connection */
var monk = require('monk');
var db =  monk('localhost:27017/borrowDB');

/* Handle multipart form data */
var multer = require('multer');
var upload = multer();



// Home page
router.get('/', function(req, res, next) {

if (req.session.user == null){

	var items = db.get('items');

		items.find({}, function (err, docs){
			res.render('home', 
		  	{ 
		  		User : null,
		  		library: docs
		  	});
		})


  		console.log("NO sessions")
	  }
	  else{
	  console.log("Session exists")	
	  var items = db.get('items');

		items.find({}, function (err, docs){
			res.render('home', 
		  	{ 
		  		User : req.session.user,
		  		library: docs
		  	});
		})
	  }
});

router.post('/', function(req, res, next){
	var search = req.body.search;
	search = ".*" + search + ".*"

	if (req.session.user == null){
		var items = db.get('items');
		items.find({"name" : {$regex : search}}, function (err, docs){
			res.render('home', 
			  	{ 
			  		User : null,
			  		library: docs
			  	});
		});
	  }
	  else{
	  	var items = db.get('items');
	  items.find({"name" : {$regex : search}}, function (err, docs){
			res.render('home', 
			  	{ 
			  		User : req.session.user,
			  		library: docs
			  	});
		});
	}
});


//Log user out
router.get('/logout', function(req,res){
	req.session.destroy(function(e){ res.redirect('/') });
	
});

router.get('/library', function(req,res){

	if (req.session.user != null){

		var items = db.get('items');

		items.find({owner: req.session.user.user}, function (err, docs){
			res.render('library', 
		  	{ 
		  		User : req.session.user,
		  		library: docs
		  	});
		})
	}
		
	else{
		res.redirect('/');
	}
});


router.post('/library', function(req, res){
	var itemName = req.body.itemName;
	var imgFile = req.body.imgFile;
	var days = req.body.days;

	console.log(imgFile);
	var items = db.get('items');

	items.insert({
				name: itemName,
				image: imgFile,
				days: days,
				owner: req.session.user.user,
				status: "available",
				current: req.session.user.user,
				timeCreated: moment().format('MMMM Do YYYY, h:mm a')
			}, function (err, itemAdded) {
                if (err) {
                    res.send('Cannot register user');
                }
                else {
                	console.log(itemAdded)
                    res.redirect('/library');
                }
            });


});


router.get('/borrowed', function(req, res){
	if (req.session.user != null){

		var items = db.get('items');

		items.find({current: req.session.user.user}, function (err, docs){
			res.render('borrowed', 
		  	{ 
		  		User : req.session.user,
		  		library: docs
		  	});
		})
	}
		
	else{
		res.redirect('/');
	}

});

router.post('/borrowed', function(req, res){
	var ownerName = req.body.owner;
	var itemName = req.body.item;
	var items = db.get('items');


	items.findOne({ owner: ownerName,  name: itemName}, function(err, findUser) {
		console.log(findUser._id);


		items.findAndModify(
	      {
	        "query": { "_id": findUser._id },
	        "update": { "$set": { 
	            status: "unavailable", 
				current: req.session.user.user
	        }},
	        "options": { "new": true, "upsert": true }
	      }, function(err,doc){
          		res.redirect('/borrowed')
    		})
	});

});

router.post('/return', function(req, res){
	var itemName = req.body.item;
	var items = db.get('items');


	items.findOne({ current: req.session.user.user, name: itemName, status: "unavailable"}, function(err, findUser) {
		items.findAndModify(
	      {
	        "query": { "_id": findUser._id },
	        "update": { "$set": { 
	            status: "available", 
				current: findUser.owner
	        }},
	        "options": { "new": true, "upsert": true }
	      }, function(err,doc){
          		res.redirect('/borrowed')
    		})
	});

});




// List of articles
router.get('/articles', function(req, res) {
    var articles = db.get('articles');
    articles.find({}, {}, function(err, articles){
    	if (err) {
    		console.log(err);
    	}
        res.render('articles', {
            articles: articles
        });
    });
});


router.get('/register', function(req,res){
	res.render("register");
});

router.post('/register', function(req, res) {
	var userName = req.body.user;
	var password = req.body.password;
	var accounts = db.get('accounts');

	accounts.findOne({ user: userName }, function(err, findUser) {
		if (err) {
			console.log(err);
		}
		//User doesn't exist, so create
		if (!findUser) {
			accounts.insert({
				user: userName,
				pass: password,
				timeCreated: moment().format('MMMM Do YYYY, h:mm a')
			}, function (err, userFound) {
                if (err) {
                    res.send('Cannot register user');
                }
                else {
                	req.session.user = userFound;
                	console.log(req.session.user)
                    res.redirect('/');
                }
            });
		}
		//User exists so do nothing.
		else {
			console.log("User already exists.")
		}
	});
});

router.get('/login', function(req,res){
	res.render("login");
});


// Add article from UI
router.post('/login', function(req, res) {
	var userName = req.body.user;
	var password = req.body.password;
	var accounts = db.get('accounts');

	accounts.findOne({ user: userName }, function(err, findUser) {
		if (err) {
			console.log(err);
		}
		//User doesn't exist, so create
		if (!findUser) {
			console.log("Invalid credentials");
		}
		//User exists so do nothing.
		else {
			console.log(findUser.pass)
			console.log(findUser.pass)
			if (findUser.pass == password){
					req.session.user = findUser;
                	console.log(req.session.user)
                    res.redirect('/');
			}
			console.log("test?")
		}
	});
});

module.exports = router;