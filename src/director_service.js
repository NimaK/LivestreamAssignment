var restify = require('restify');
var server = restify.createServer();
server.use(restify.bodyParser());

var redis = require('redis');
var redisClient = redis.createClient();

var client = restify.createJsonClient({
	url: 'https://api.new.livestream.com'
});
client.on('error', function (err) {
	console.log("Account service client error: " + err);
});


// Create (register) director
// HTTP Request: POST
// Request Body: {"livestream_id": "<ID value>"}
// Returns newly registered director, or previously registered director if already registered
server.post('/service/director', function(req, res, next) {
	var id = req.body.livestream_id;

	// check for directors who've already been registered, if not, create a new director
	redisClient.hgetall('director:'+ id, function(err, existingDirector) {
		if (err) {
			console.log('Error occurred when querying for director:' + id);
			console.log(err);
			res.send(500);
			return;
		}
		// already exists
		if (existingDirector !== null) {
			existingDirector.favorite_movies = JSON.parse(existingDirector.favorite_movies);
			res.send(200, existingDirector);
			return;
		}
		// get account info from Livestream service and register/save new director
		else {
			registerNewDirector(id, res);
		}
	});
});


// Update director
// HTTP Request: PUT
// Request Param: livestream account ID of director
// Request Body: {"<attribute name>": "<attribute value>", ...} 
// Returns the updated director, or registers/creates the director with new attributes if not previously registered
server.put('/service/director/:id', function(req, res, next) {
	var id = req.params.id;
	var fav_camera = req.body.favorite_camera;
	var fav_movies = req.body.favorite_movies;

	if (typeof(fav_camera) !== 'string') {
		res.send(400, 'favorite_camera attribute must be a string.');
		return;
	}
	if (fav_movies && !Array.isArray(fav_movies)) {
		res.send(400, 'favorite_movies attribute must be an array.');
		return;
	}

	redisClient.hgetall('director:'+ id, function(err, existingDirector) {
		if (err) {
			console.log('Error occurred when querying for director:' + id);
			console.log(err);
			res.send(500);
			return;
		}
		// already exists
		if (existingDirector !== null) {
			// already created
			if (fav_camera) {
				existingDirector.favorite_camera = fav_camera;
				redisClient.hmset(
					'director:' + id,
					'favorite_camera', fav_camera
				);
			}
			if (fav_movies) {
				existingDirector.favorite_movies = fav_movies;
				redisClient.hmset(
					'director:' + id,
					'favorite_movies', JSON.stringify(fav_movies)
				);
			}
			res.send(200, existingDirector);
			return;
		}
		else {
			registerNewDirector(id, res, {'favorite_camera': fav_camera, 'favorite_movies': fav_movies});
		}
	});

});


// List all directors
// HTTP Request: GET
// Returns all directors
server.get('/service/director', function(req, res, next) {
	redisClient.sort(['directorSet', 
			'BY', 'nosort', 
			'GET', '*->full_name', 
			'GET', '*->favorite_camera', 
			'GET', '*->favorite_movies'
		], 
		function(err, result) {
			var i, directors = [];
			for (i = 0 ; i < result.length; ) {
				directors.push( {
					"full_name" : result[i],
					"favorite_camera" : result[i+1],
					"favorite_movies" : JSON.parse(result[i+2]),
				});
				i += 3;
			}
			res.send(200, directors);
		}
	);
});


// Registers a new director with the given ID (contacts Livestream accounts service)
// fields argument is optional
function registerNewDirector(id, response, fields) {
	fields = fields || {};
	client.get('/accounts/' + id, function(lsErr, lsReq, lsRes, lsObj) {
		// handle errors from livestream account service
		if (lsErr) {
			console.log('Error occurred when retrieving account from livestream account service for ID:' + id);
			console.log(lsErr);
			response.send(400, 'Please ensure that account ID is valid.');
			return;
		}

		// save a director in the database
		var director = {};
		var dirHashkey = 'director:' + director.livestream_id
		director.livestream_id = lsObj.id;
		director.full_name = lsObj.full_name;
		director.favorite_camera = fields.favorite_camera || '';
		director.favorite_movies = fields.favorite_movies || [];

		redisClient.hmset(
			// id
			'director:' + director.livestream_id,
			// data in key-value pairs
			'full_name', director.full_name,
			'favorite_camera', director.favorite_camera,
			'favorite_movies', JSON.stringify(director.favorite_movies),
			'livestream_id', director.livestream_id
		);
		// add director (id) to directorSet
		redisClient.sadd(['directorSet', dirHashkey]);

		response.send(201, director);	// Created success code
		return;
	});
}


server.listen(8080, function() {
	console.log('director service listening at %s', server.url);
});