# LivestreamAssignment

Welcome to the LivestreamAssignment wiki!

Take home assignment from Livestream.

# Setup
Developed using Node 4.4.7.

First install the dependencies

    npm install

Start the redis server

    redis-server

Start the director REST service

    node src/director_server.js

Run the tests

    node test/director_service_test.js

# API

| Operation        | Method           | URI  | HTTP Request Body  | Returns (Response Body) |
| ---------------- |:----------------:| -----|--------------------|-------------------------|
| Create director | POST | http://localhost:8080/service/director| { "livestream_id": \<id of an account from livestream service\> } | Created director object (JSON)
| Update director | PUT  | http://localhost:8080/service/director/\<id\>| JSON key-value pairs, supported attributes:<br/>"favorite_camera" - string<br/>"favorite_movies" - array | Updated (Or, newly created, if not registered before) director object with new attribute values (JSON) |
| List all directors | GET  | http://localhost:8080/service/director| | Array of all directors |
