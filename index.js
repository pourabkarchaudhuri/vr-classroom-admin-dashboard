//
require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var flash = require('connect-flash');
var passport = require('passport');
var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
var graph = require('./graph');
// var https = require('https');
//
var http = require("http");
var fs = require("fs");

// var table = require('./table.js');
var blob = require('./blob.js');
var httpsPort = 443;
var port = process.env.PORT || 3001;
var ip = process.env.IP || "0.0.0.0";



// var express = require('express');
// var cookieParser = require('cookie-parser');
var multer = require('multer');
var path = require('path');
var app  = express();

var httpsOptions = null;
var server;

const oauth2 = require('simple-oauth2').create({
    client: {
      id: process.env.OAUTH_APP_ID,
      secret: process.env.OAUTH_APP_PASSWORD
    },
    auth: {
      tokenHost: process.env.OAUTH_AUTHORITY,
      authorizePath: process.env.OAUTH_AUTHORIZE_ENDPOINT,
      tokenPath: process.env.OAUTH_TOKEN_ENDPOINT
    }
  });

  

if(fs.existsSync('https.pfx')){
    httpsOptions = {
        pfx: fs.readFileSync('https.pfx')
    }
}
else if(fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
    httpsOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    }
}

// app.use(express.static(path.resolve(__dirname, 'client')));
app.use(cookieParser());
app.use(multer({ dest: './uploads/' }));
// table(app);
blob(app);




// Configure passport

// In-memory storage of logged-in users
// For demo purposes only, production apps should store
// this in a reliable storage
var users = {};

// Passport calls serializeUser and deserializeUser to
// manage users
passport.serializeUser(function(user, done) {
  // Use the OID property of the user as a key
  users[user.profile.oid] = user;
  done (null, user.profile.oid);
});

passport.deserializeUser(function(id, done) {
  done(null, users[id]);
});

// Callback function called once the sign-in is complete
// and an access token has been obtained
async function signInComplete(iss, sub, profile, accessToken, refreshToken, params, done) {
  if (!profile.oid) {
    return done(new Error("No OID found in user profile."), null);
  }

  try{
    const user = await graph.getUserDetails(accessToken);

    if (user) {
      // Add properties to profile
      profile['email'] = user.mail ? user.mail : user.userPrincipalName;
    }
  } catch (err) {
    done(err, null);
  }

  // Create a simple-oauth2 token from raw tokens
  let oauthToken = oauth2.accessToken.create(params);

  // Save the profile and tokens in user storage
  users[profile.oid] = { profile, oauthToken };
  return done(null, users[profile.oid]);
}

// Configure OIDC strategy
passport.use(new OIDCStrategy(
  {
    identityMetadata: `${process.env.OAUTH_AUTHORITY}${process.env.OAUTH_ID_METADATA}`,
    clientID: process.env.OAUTH_APP_ID,
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: process.env.OAUTH_REDIRECT_URI,
    allowHttpForRedirectUrl: true,
    clientSecret: process.env.OAUTH_APP_PASSWORD,
    validateIssuer: false,
    passReqToCallback: false,
    scope: process.env.OAUTH_SCOPES.split(' ')
  },
  signInComplete
));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var calendarRouter = require('./routes/calendar');
var blobRouter = require('./routes/blob');
var roomRouter = require('./routes/room')

// var app = express();

// Session middleware
// NOTE: Uses default in-memory session store, which is not
// suitable for production
app.use(session({
  secret: 'your_secret_value_here',
  resave: false,
  saveUninitialized: false,
  unset: 'destroy'
}));

// Flash middleware
app.use(flash());

// Set up local vars for template layout
app.use(function(req, res, next) {
  // Read any flashed errors and save
  // in the response locals
  res.locals.error = req.flash('error_msg');

  // Check for simple error string and
  // convert to layout's expected format
  var errs = req.flash('error');
  for (var i in errs){
    res.locals.error.push({message: 'An error occurred', debug: errs[i]});
  }

  next();
});

app.use(express.static(path.resolve(__dirname, 'views')));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

var hbs = require('hbs');
var moment = require('moment');
// Helper to format date/time sent by Graph
hbs.registerHelper('eventDateTime', function(dateTime){
  return moment(dateTime).format('M/D/YY h:mm A');
});


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  // Set the authenticated user in the
  // template locals
  if (req.user) {
    res.locals.user = req.user.profile;
  }
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/calendar', calendarRouter);
app.use('/blob', blobRouter);
app.use('/create', roomRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// module.exports = app;
// if(httpsOptions){
//     console.log("HTTPS Configuration exists!");
//     var https = require("https");
    
//     var httpsServer = https.createServer(httpsOptions,app);
//     httpsServer.listen(httpsPort, ip, function(){
//         var addr = server.address();
//         console.log("Https server listening at", addr.address + ":" + httpsPort);
//     });
    
//     server = http.createServer(function(req,res){
//         // redirect to https
//         res.writeHead(301,{
//             Location: 'https://' + req.headers.host  + req.url
//         });
//         res.end();
//     });
// }
// else{
    // console.log("HTTPS Configuration absent!");
    // server = http.createServer(app);
// }
var https = require('https');
https.createServer({
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
  passphrase: 'tempid'
}, app)
.listen(port, ip, ()=>{
  // var addr = server.address();
    console.log("Web server listening at ", port);
});

// server.listen(port, ip , function () {
//     var addr = server.address();
//     console.log("Web server listening at", addr.address + ":" + addr.port);
// });
