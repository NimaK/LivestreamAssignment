var assert = require('assert');

// REST client setup
var restify = require('restify');
var client = restify.createJsonClient({
	url: 'http://localhost:8080'
});
client.on('error', function (err) {
	console.log("Error " + err);
});

// REDIS client setup (for post test cleanup - no DELETE api method)
var redis = require('redis');
// var redisClient = redis.createClient();

var testDirSvc = {
	path: '/service/director'
}


function testCreate() {
	try {
		client.post(testDirSvc.path, {
				'livestream_id': '6488844'
			},
			function(err, req, res, obj) {
				try {
					assert.ifError(err);
					assert.equal(res.statusCode, 201, "Mismatched status code");
					assert.equal(res.headers['content-type'], 'application/json');
					assert.equal(obj.full_name, 'Debbie Nalley Hoehn');
					assert.equal(obj.favorite_camera, '');
					assert.deepEqual(obj.favorite_movies, []);
					console.log('testCreate passed.');
				} catch (err) {
					console.log(err);
				} finally {
					postTest('6488844');
				}
			}
		);

	} catch(err) {
		console.log(err);
	}
}

function testCreateDuplicate() {
	try {
		client.post(testDirSvc.path, {
				'livestream_id': '6488845'
			},
			function(err, req, res, obj) {
				assert.ifError(err);
				
				// call again, expect 200 
				client.post(testDirSvc.path, {
					'livestream_id': '6488845'
				},
				function(err2, req2, res2, obj2) {
					try {
						assert.ifError(err2);
						assert.equal(res2.statusCode, 200, "Mismatched status code");
						assert.equal(res2.headers['content-type'], 'application/json');
						assert.equal(obj2.full_name, 'John Simmons');
						assert.equal(obj2.favorite_camera, '');
						assert.deepEqual(obj2.favorite_movies, []);
						console.log('testCreateDuplicate passed.');
					} catch (err) {
						console.log(err);
					} finally {
						postTest('6488845');
					}
				});
				
			}
		);
	} catch(err) {
		console.log(err);
	} 
}

function testUpdate() {
	try {
		// create initial (POST)
		client.post(testDirSvc.path, {
				'livestream_id': '6488846'
			},
			function(err, req, res, obj) {
				assert.ifError(err);
				try {
					// call api again with update operation (PUT)
					client.put(testDirSvc.path + '/6488846', {
							'favorite_camera': 'iPhone 4',
							'favorite_movies': ['Up', 'WALL-E', 'The Incredibles', 'Finding Nemo']
						},
						function(err2, req2, res2, obj2) {
							assert.ifError(err2);
							assert.equal(res2.statusCode, 200, "Mismatched status code");
							assert.equal(res2.headers['content-type'], 'application/json');
							assert.equal(obj2.full_name, 'Kabine Mao Diane');
							assert.equal(obj2.favorite_camera, 'iPhone 4');
							assert.deepEqual(obj2.favorite_movies, ['Up', 'WALL-E', 'The Incredibles', 'Finding Nemo']);
							console.log('testUpdate passed.');
						}
					);
				} catch (err) {
					console.log(err);
				} finally {
					postTest('6488846');
				}
			}
		);
	} catch(err) {
		console.log(err);
	} 
}

function testUpdateNoCreate() {
	// call update (PUT) without having registered/created before (POST) - get 201 Created
	try {
		client.put(testDirSvc.path + '/6488847', {
				'favorite_camera': 'iPhone 5',
				'favorite_movies': ['Up', 'WALL-E', 'The Incredibles', 'Finding Nemo']
			},
			function(err, req, res, obj) {
				try {
					assert.ifError(err);
					assert.equal(res.statusCode, 201, "Mismatched status code");
					assert.equal(res.headers['content-type'], 'application/json');
					assert.equal(obj.full_name, 'JonasMC');
					assert.equal(obj.favorite_camera, 'iPhone 5');
					assert.deepEqual(obj.favorite_movies, ['Up', 'WALL-E', 'The Incredibles', 'Finding Nemo']);
					console.log('testUpdateNoCreate passed.');
				} catch (err) {
					console.log(err);
				} finally {
					postTest('6488847');
				}
			}
		);
	} catch(err) {
		console.log(err);
	}
}

function testListAll() {
	var redisClient = redis.createClient();
	// pre-fill data source with some directors (adding directly in this case)
	// database may already have some, but at least should have these during this test
	var dir1 = {
		full_name: 'Akira Kurosawa',
		favorite_camera: 'Nikon',
		favorite_movies: ['The Magnificent Seven'],
		id: '1234'
	};
	var dir2 = {
		full_name: 'Quentin Tarantino',
		favorite_camera: '',
		favorite_movies: ['Goodfellas', 'Bambi'],
		id: '5678'
	};
	var dir3 = {
		full_name: 'Me',
		favorite_camera: 'iPhone 5S',
		favorite_movies: ['The Godfather'],
		id: '90'
	};
	try {
		redisClient.multi()
			.hmset(
				// id
				'director:' + dir1.id,
				// data in key-value pairs
				'full_name', dir1.full_name,
				'favorite_camera', dir1.favorite_camera,
				'favorite_movies', JSON.stringify(dir1.favorite_movies),
				'livestream_id', dir1.id
			)
			.hmset(
				// id
				'director:' + dir2.id,
				// data in key-value pairs
				'full_name', dir2.full_name,
				'favorite_camera', dir2.favorite_camera,
				'favorite_movies', JSON.stringify(dir2.favorite_movies),
				'livestream_id', dir2.id
			)
			.hmset(
				// id
				'director:' + dir3.id,
				// data in key-value pairs
				'full_name', dir3.full_name,
				'favorite_camera', dir3.favorite_camera,
				'favorite_movies', JSON.stringify(dir3.favorite_movies),
				'livestream_id', dir3.id
			)
			.sadd(['directorSet', 'director:' + dir1.id, 'director:' + dir2.id, 'director:' + dir3.id])
			.exec(function(err, res) {
				redisClient.quit();

				client.get(testDirSvc.path, function(err, req, res, data) {
					try {
						// verify that the added directors are in all
						var directorList = {};
						directorList[dir1.full_name] = true;
						directorList[dir2.full_name] = true;
						directorList[dir3.full_name] = true;
						for (var i = 0; i < data.length; i++) {
							if (directorList[data[i].full_name]) {
								delete directorList[data[i].full_name];
							}
						}
						assert.equal(Object.keys(directorList).length, 0);
						console.log('testListAll passed.')
					} catch (err) {
						console.log(err);
					} finally {
						postTest('1234');
						postTest('5678');
						postTest('90');
					}
				});
			});
	} catch (err) {
		console.log(err);
	} finally {
		// postTest('1234');
		// postTest('5678');
		// postTest('90');
	}
}

function postTest(livestream_id) {
	var redisClient = redis.createClient();
	redisClient.multi()
		.srem(['directorSet', 'director:'+livestream_id], function(err, res) {
			if(err) {
				console.log('Error removing from directorSet: director:'+livestream_id);
			}
		})
		.del('director:'+livestream_id, function(err, res) {
			if(err) {
				console.log('Error removing hash director:'+livestream_id);
			}
		})
		.exec(function(err, res) {
			redisClient.quit();
		});
}

function runAll() {
	// run tests
	try {
		testCreate();
		testCreateDuplicate();
		testUpdate();
		testUpdateNoCreate();
		testListAll();
	} catch (error) {
		console.log(error);
	} 
}

runAll();